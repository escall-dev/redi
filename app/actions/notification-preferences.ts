"use server"

import { createClient } from "@/lib/supabase/server"
import {
  type NotificationCategory,
  type NotificationPreferences,
  type NotificationPreferenceActionResponse,
  type ReminderTimingOption,
  type ReminderTimingActionResponse,
  isValidNotificationCategory,
  isValidReminderTimingOption,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/lib/notifications/types"
import {
  getNotificationPreferences,
  mapRowToPreferences,
} from "@/lib/server/notification-preferences"
import type { Database } from "@/lib/supabase/types"

type PreferenceUpdate = Database["public"]["Tables"]["notification_preferences"]["Update"]
type PreferenceInsert = Database["public"]["Tables"]["notification_preferences"]["Insert"]

/**
 * Server Action: Fetches the authenticated user's notification preferences.
 * If no preference row exists, returns standard defaults.
 */
export async function getNotificationPreferencesAction(): Promise<{
  ok: boolean
  preferences: NotificationPreferences
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return {
      ok: false,
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      error: "Authentication required to retrieve notification preferences.",
    }
  }

  const preferences = await getNotificationPreferences(user.id)
  return {
    ok: true,
    preferences,
  }
}

/**
 * Server Action: Atomically updates a single notification category preference.
 *
 * SECURITY INVARIANTS:
 * 1. Derives user_id exclusively from verified Supabase Auth session (never client payload).
 * 2. Validates category against strictly typed whitelist.
 * 3. Atomic mutation: Only the requested category column is modified; all other preferences
 *    remain unchanged.
 * 4. Safe initialization: If no preference record exists yet, the row is inserted with the
 *    requested category value and PostgreSQL defaults (TRUE) for all other categories.
 */
export async function updateNotificationPreferenceAction(
  category: NotificationCategory,
  enabled: boolean
): Promise<NotificationPreferenceActionResponse> {
  // 1. Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return {
      ok: false,
      error: "Authentication required to update notification preferences.",
    }
  }

  // 2. Validate category against whitelist
  if (!isValidNotificationCategory(category)) {
    return {
      ok: false,
      error: `Invalid notification category '${String(category)}'.`,
    }
  }

  // 3. Validate boolean value
  if (typeof enabled !== "boolean") {
    return {
      ok: false,
      error: "Preference value must be a valid boolean.",
    }
  }

  try {
    // 4. Check if row exists for authenticated user
    const { data: existing, error: selectError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (selectError) {
      return {
        ok: false,
        error: "Failed to verify existing notification preferences.",
      }
    }

    let finalPreferences: NotificationPreferences

    if (existing) {
      // Atomic UPDATE on only the specified column
      const updatePayload: PreferenceUpdate = { [category]: enabled }
      const { data: updatedRow, error: updateError } = await supabase
        .from("notification_preferences")
        .update(updatePayload)
        .eq("user_id", user.id)
        .select()
        .single()

      if (updateError || !updatedRow) {
        return {
          ok: false,
          error: "Failed to update notification preference.",
        }
      }

      finalPreferences = mapRowToPreferences(updatedRow as unknown as Partial<NotificationPreferences>)
    } else {
      // Initial INSERT: only specified category is explicitly provided;
      // database DEFAULT applies to all other categories.
      const insertPayload: PreferenceInsert = {
        user_id: user.id,
        [category]: enabled,
      }
      const { data: insertedRow, error: insertError } = await supabase
        .from("notification_preferences")
        .insert(insertPayload)
        .select()
        .single()

      if (insertError) {
        // Handle race condition where row was created concurrently
        if (insertError.code === "23505") {
          const retryPayload: PreferenceUpdate = { [category]: enabled }
          const { data: retryRow, error: retryError } = await supabase
            .from("notification_preferences")
            .update(retryPayload)
            .eq("user_id", user.id)
            .select()
            .single()

          if (retryError || !retryRow) {
            return {
              ok: false,
              error: "Failed to update notification preference on retry.",
            }
          }

          finalPreferences = mapRowToPreferences(retryRow as unknown as Partial<NotificationPreferences>)
        } else {
          return {
            ok: false,
            error: "Failed to initialize notification preferences.",
          }
        }
      } else {
        finalPreferences = mapRowToPreferences(insertedRow as unknown as Partial<NotificationPreferences>)
      }
    }

    // Trigger cycle reminder recalculation in the background
    try {
      const { syncUserReminders } = await import("@/lib/reminders/sync")
      void syncUserReminders(user.id, supabase)
    } catch {
      // Background recalculation failure does not fail preference update
    }

    return {
      ok: true,
      category,
      enabled,
      preferences: finalPreferences,
    }
  } catch {
    return {
      ok: false,
      error: "An unexpected error occurred while saving notification preferences.",
    }
  }
}

/**
 * Server Action: Updates the user's cycle reminder timing preference (3 days before, 1 day before, or 0 days).
 */
export async function updateReminderTimingAction(
  reminderDaysBefore: ReminderTimingOption
): Promise<ReminderTimingActionResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return {
      ok: false,
      error: "Authentication required to update reminder timing.",
    }
  }

  if (!isValidReminderTimingOption(reminderDaysBefore)) {
    return {
      ok: false,
      error: "Invalid reminder timing option. Must be 0, 1, or 3 days.",
    }
  }

  try {
    const { data: existing } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()

    let finalPreferences: NotificationPreferences

    if (existing) {
      const { data: updatedRow, error: updateError } = await supabase
        .from("notification_preferences")
        .update({ reminder_days_before: reminderDaysBefore })
        .eq("user_id", user.id)
        .select()
        .single()

      if (updateError || !updatedRow) {
        return {
          ok: false,
          error: "Failed to update reminder timing.",
        }
      }

      finalPreferences = mapRowToPreferences(updatedRow as unknown as Partial<NotificationPreferences>)
    } else {
      const { data: insertedRow, error: insertError } = await supabase
        .from("notification_preferences")
        .insert({
          user_id: user.id,
          reminder_days_before: reminderDaysBefore,
        })
        .select()
        .single()

      if (insertError || !insertedRow) {
        return {
          ok: false,
          error: "Failed to save reminder timing.",
        }
      }

      finalPreferences = mapRowToPreferences(insertedRow as unknown as Partial<NotificationPreferences>)
    }

    // Trigger cycle reminder recalculation in the background
    try {
      const { syncUserReminders } = await import("@/lib/reminders/sync")
      void syncUserReminders(user.id, supabase)
    } catch {
      // Ignored
    }

    return {
      ok: true,
      reminderDaysBefore,
      preferences: finalPreferences,
    }
  } catch {
    return {
      ok: false,
      error: "An unexpected error occurred while updating reminder timing.",
    }
  }
}
