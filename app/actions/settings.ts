"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface SettingsActionResult {
  success?: boolean
  error?: string
  message?: string
}

function isValidDateFormat(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const d = new Date(dateStr + "T00:00:00")
  return !isNaN(d.getTime())
}

function containsHtml(str: string): boolean {
  return /<[^>]*>/g.test(str)
}

/**
 * Server Action: Update user profile and cycle preferences
 */
export async function updateSettingsAction(
  _prevState: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: "Your session has expired. Please sign in again.",
    }
  }

  const rawDisplayName = (formData.get("displayName") as string | null) ?? ""
  const displayName = rawDisplayName.trim()
  const avatarUrl = (formData.get("avatarUrl") as string | null)?.trim() || null
  const cycleLengthStr = (formData.get("typicalCycleLength") as string | null)?.trim() ?? ""
  const lastPeriodStart = (formData.get("lastPeriodStart") as string | null)?.trim() ?? ""

  // 1. Validate Display Name
  if (!displayName) {
    return {
      success: false,
      error: "Please enter your display name.",
    }
  }

  if (displayName.length < 2) {
    return {
      success: false,
      error: "Display name must be at least 2 characters long.",
    }
  }

  if (displayName.length > 50) {
    return {
      success: false,
      error: "Display name must be 50 characters or fewer.",
    }
  }

  if (containsHtml(displayName)) {
    return {
      success: false,
      error: "Display name contains invalid characters.",
    }
  }

  // 2. Validate Typical Cycle Length (21–45 days, integer only, no decimals)
  if (!cycleLengthStr) {
    return {
      success: false,
      error: "Please enter your typical cycle length.",
    }
  }

  // Check for decimals or non-numeric characters
  if (!/^\d+$/.test(cycleLengthStr)) {
    return {
      success: false,
      error: "Typical cycle length must be a whole number of days.",
    }
  }

  const cycleLength = parseInt(cycleLengthStr, 10)
  if (isNaN(cycleLength) || cycleLength < 21 || cycleLength > 45) {
    return {
      success: false,
      error: "Typical cycle length must be between 21 and 45 days.",
    }
  }

  // 3. Validate Last Period Start Date
  if (!lastPeriodStart || !isValidDateFormat(lastPeriodStart)) {
    return {
      success: false,
      error: "Please select a valid date for when your last period started.",
    }
  }

  const todayStr = new Date().toISOString().split("T")[0]
  if (lastPeriodStart > todayStr) {
    return {
      success: false,
      error: "Last period start date cannot be in the future.",
    }
  }

  // 4. Update Profile in Supabase (scoped strictly to auth.uid())
  try {
    const updatePayload: {
      display_name: string
      typical_cycle_length: number
      last_period_start: string
      updated_at: string
      avatar_url?: string | null
    } = {
      display_name: displayName,
      typical_cycle_length: cycleLength,
      last_period_start: lastPeriodStart,
      updated_at: new Date().toISOString(),
    }

    if (avatarUrl !== undefined) {
      updatePayload.avatar_url = avatarUrl
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", user.id)

    if (updateError) {
      console.error("[updateSettingsAction]", updateError.message)
      return {
        success: false,
        error: "Unable to save your settings. Please try again.",
      }
    }

    // Also update auth user metadata for display_name and avatar_url
    await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        avatar_url: avatarUrl,
      },
    })

    revalidatePath("/settings")
    revalidatePath("/dashboard")
    revalidatePath("/calendar")

    return {
      success: true,
      message: "Your settings have been saved.",
    }
  } catch (err: unknown) {
    console.error("[updateSettingsAction]", err)
    return {
      success: false,
      error: "An unexpected error occurred while saving your settings.",
    }
  }
}

/**
 * Server Action: Upload custom avatar image or save preset directly
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Your session has expired. Please sign in again." }
  }

  const file = formData.get("file") as File | null
  const dataUrl = (formData.get("dataUrl") as string | null)?.trim()
  const presetId = (formData.get("presetId") as string | null)?.trim()
  const isRemove = formData.get("remove") === "true" || (!file && !dataUrl && !presetId)

  // 1. Remove custom photo and revert to initials
  if (isRemove) {
    await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user.id)
    await supabase.auth.updateUser({ data: { avatar_url: null } })
    revalidatePath("/settings")
    revalidatePath("/dashboard")
    return { success: true, avatarUrl: "" }
  }

  // 2. If preset provided (legacy fallback)
  if (presetId) {
    const avatarUrl = presetId.startsWith("preset:") ? presetId : `preset:${presetId}`
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id)
    await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } })
    revalidatePath("/settings")
    revalidatePath("/dashboard")
    return { success: true, avatarUrl }
  }

  // 3. Custom file upload
  if (!file && !dataUrl) {
    return { success: false, error: "No image file provided." }
  }

  let finalAvatarUrl: string | null = null

  if (file && file.size > 0) {
    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File exceeds maximum size of 10MB." }
    }

    // Validate type strictly
    const type = file.type.toLowerCase()
    const name = file.name.toLowerCase()
    const isJpg = type === "image/jpeg" || type === "image/jpg" || name.endsWith(".jpg") || name.endsWith(".jpeg")
    if (!isJpg) {
      return { success: false, error: "Only JPEG/JPG formats are supported." }
    }

    try {
      const fileName = `${user.id}/avatar-${Date.now()}.jpg`
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        })

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(uploadData.path)
        finalAvatarUrl = publicUrlData.publicUrl
      }
    } catch (storageErr) {
      console.warn("[uploadAvatarAction] Supabase storage upload failed, using fallback:", storageErr)
    }
  }

  // 3. Fallback to client-optimized dataUrl if storage upload failed or dataUrl provided
  if (!finalAvatarUrl && dataUrl) {
    finalAvatarUrl = dataUrl
  }

  if (!finalAvatarUrl) {
    return { success: false, error: "Failed to upload avatar image." }
  }

  // Save to profile
  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: finalAvatarUrl })
    .eq("user_id", user.id)

  if (dbError) {
    console.error("[uploadAvatarAction] DB update error:", dbError.message)
    return { success: false, error: "Failed to update profile picture." }
  }

  await supabase.auth.updateUser({ data: { avatar_url: finalAvatarUrl } })
  revalidatePath("/settings")
  revalidatePath("/dashboard")

  return { success: true, avatarUrl: finalAvatarUrl }
}
