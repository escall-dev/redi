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
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        typical_cycle_length: cycleLength,
        last_period_start: lastPeriodStart,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (updateError) {
      console.error("[updateSettingsAction]", updateError.message)
      return {
        success: false,
        error: "Unable to save your settings. Please try again.",
      }
    }

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
