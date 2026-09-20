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
  const sex = (formData.get("sex") as string | null)?.trim() || null
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

  // 2. Validate Sex (if provided)
  if (sex && !["male", "female", "prefer_not_to_say"].includes(sex)) {
    return {
      success: false,
      error: "Please select a valid option for sex.",
    }
  }

  // Check current profile to determine if user is supporter
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("usage_role")
    .eq("user_id", user.id)
    .single()

  const isSupporter = currentProfile?.usage_role === "supporter"

  // 3. Conditionally Validate Cycle Details
  let cycleLength: number | null = null

  if (!isSupporter || lastPeriodStart || cycleLengthStr) {
    if (!cycleLengthStr && !isSupporter) {
      return {
        success: false,
        error: "Please enter your typical cycle length.",
      }
    }

    if (cycleLengthStr) {
      if (!/^\d+$/.test(cycleLengthStr)) {
        return {
          success: false,
          error: "Typical cycle length must be a whole number of days.",
        }
      }

      const parsedLength = parseInt(cycleLengthStr, 10)
      if (isNaN(parsedLength) || parsedLength < 21 || parsedLength > 45) {
        return {
          success: false,
          error: "Typical cycle length must be between 21 and 45 days.",
        }
      }
      cycleLength = parsedLength
    }

    if (!isSupporter && (!lastPeriodStart || !isValidDateFormat(lastPeriodStart))) {
      return {
        success: false,
        error: "Please select a valid date for when your last period started.",
      }
    }

    if (lastPeriodStart) {
      if (!isValidDateFormat(lastPeriodStart)) {
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
    }
  }

  // 4. Update Profile in Supabase (scoped strictly to auth.uid())
  try {
    const updatePayload: {
      display_name: string
      updated_at: string
      sex?: "male" | "female" | "prefer_not_to_say" | null
      typical_cycle_length?: number | null
      last_period_start?: string | null
      avatar_url?: string | null
    } = {
      display_name: displayName,
      updated_at: new Date().toISOString(),
    }

    if (sex !== null) {
      updatePayload.sex = sex as "male" | "female" | "prefer_not_to_say"
    }

    if (avatarUrl !== undefined) {
      updatePayload.avatar_url = avatarUrl
    }

    if (cycleLength !== null) {
      updatePayload.typical_cycle_length = cycleLength
    }

    if (lastPeriodStart) {
      updatePayload.last_period_start = lastPeriodStart
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", user.id)

    if (updateError) {
      // If sex column migration is pending, retry without sex
      if (
        updateError.message.toLowerCase().includes("column") ||
        updateError.message.toLowerCase().includes("does not exist")
      ) {
        const fallbackPayload = { ...updatePayload }
        delete fallbackPayload.sex
        await supabase.from("profiles").update(fallbackPayload).eq("user_id", user.id)
      } else {
        console.error("[updateSettingsAction]", updateError.message)
        return {
          success: false,
          error: "Unable to save your settings. Please try again.",
        }
      }
    }

    // Also update auth user metadata for display_name, avatar_url, and sex
    await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        avatar_url: avatarUrl,
        ...(sex ? { sex } : {}),
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
