"use server"

import { createClient } from "@/lib/supabase/server"
import {
  type NotificationCategory,
  type NotificationPreferences,
  type NotificationPreferenceActionResponse,
  isValidNotificationCategory,
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
 * If no preference row exists, returns standard defaults (all true).
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

      return {
        ok: true,
        category,
        enabled,
        preferences: mapRowToPreferences(updatedRow),
      }
    } else {
      // Initial INSERT: only specified category is explicitly provided;
      // database DEFAULT TRUE applies to all other categories.
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

          return {
            ok: true,
            category,
            enabled,
            preferences: mapRowToPreferences(retryRow),
          }
        }

        return {
          ok: false,
          error: "Failed to initialize notification preferences.",
        }
      }

      return {
        ok: true,
        category,
        enabled,
        preferences: mapRowToPreferences(insertedRow),
      }
    }
  } catch {
    return {
      ok: false,
      error: "An unexpected error occurred while saving notification preferences.",
    }
  }
}
