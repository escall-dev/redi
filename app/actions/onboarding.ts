"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export interface OnboardingActionResult {
  success?: boolean
  error?: string
}

function isValidDateFormat(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const d = new Date(dateStr + "T00:00:00")
  return !isNaN(d.getTime())
}

export async function saveOnboardingAction(
  _prevState: OnboardingActionResult | null,
  formData: FormData
): Promise<OnboardingActionResult> {
  const displayName = (formData.get("displayName") as string)?.trim()
  const usageRole = (formData.get("usageRole") as string)?.trim()
  const lastPeriodStart = (formData.get("lastPeriodStart") as string)?.trim()
  const cycleLengthStr = (formData.get("typicalCycleLength") as string)?.trim()

  // 1. Validate Display Name
  if (!displayName || displayName.length < 2) {
    return {
      success: false,
      error: "Please enter your name (at least 2 characters).",
    }
  }

  // 2. Validate Usage Role
  if (!usageRole || !["cycle_tracker", "supporter", "both"].includes(usageRole)) {
    return {
      success: false,
      error: "Please select how you will use Seijun.",
    }
  }

  // 3. Conditionally Validate Cycle Details
  let cycleLength: number | null = null
  let periodStart: string | null = null

  if (usageRole === "cycle_tracker" || usageRole === "both") {
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

    const parsedLen = parseInt(cycleLengthStr, 10)
    if (isNaN(parsedLen) || parsedLen < 21 || parsedLen > 45) {
      return {
        success: false,
        error: "Typical cycle length must be between 21 and 45 days.",
      }
    }
    cycleLength = parsedLen
    periodStart = lastPeriodStart
  }

  // 4. Authenticate & Save to profiles
  let shouldRedirect = false
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: "Your session has expired. Please sign in again.",
      }
    }

    const avatarUrl = user.user_metadata?.avatar_url || null

    const profilePayload: {
      user_id: string
      display_name: string
      avatar_url?: string | null
      usage_role: "cycle_tracker" | "supporter" | "both"
      last_period_start: string | null
      typical_cycle_length: number | null
      onboarding_completed: boolean
    } = {
      user_id: user.id,
      display_name: displayName,
      usage_role: usageRole as "cycle_tracker" | "supporter" | "both",
      last_period_start: periodStart,
      typical_cycle_length: cycleLength,
      onboarding_completed: true,
    }

    if (avatarUrl) {
      profilePayload.avatar_url = avatarUrl
    }

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "user_id" })

    if (upsertError) {
      // If the migration has not yet been applied to Supabase, handle gracefully
      if (
        upsertError.message.toLowerCase().includes("column") ||
        upsertError.message.toLowerCase().includes("does not exist")
      ) {
        // Fallback: update basic fields without usage_role
        await supabase.from("profiles").upsert(
          {
            user_id: user.id,
            display_name: displayName,
            ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
            last_period_start: periodStart,
            typical_cycle_length: cycleLength,
            onboarding_completed: true,
          },
          { onConflict: "user_id" }
        )
      } else {
        return {
          success: false,
          error: "Unable to save your preferences. Please try again.",
        }
      }
    }

    shouldRedirect = true
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err
    }
    return {
      success: false,
      error: "An unexpected error occurred while saving your details.",
    }
  }

  if (shouldRedirect) {
    redirect("/dashboard")
  }

  return { success: true }
}
