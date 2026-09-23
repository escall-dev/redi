/**
 * Seijun Server-Side Notification Preference Utilities
 *
 * Provides a clean, authoritative query interface for notification dispatch systems
 * (Phase 18 Smart Cycle Reminders, Phase 19 Partner Connection, Phase 20 Shared Reminders).
 *
 * DESIGN INVARIANTS:
 * 1. Server-Only: Throws immediately if loaded or executed in browser runtime.
 * 2. Safe Fallbacks: Missing preference rows or query failures always resolve to DEFAULT_NOTIFICATION_PREFERENCES.
 * 3. Encapsulated: Callers receive clean boolean values or typed NotificationPreferences records without database leakage.
 * 4. Business Agnostic: Contains zero push-sending code.
 */

import { createClient } from "@/lib/supabase/server"
import {
  type NotificationCategory,
  type NotificationPreferences,
  type ReminderTimingOption,
  DEFAULT_NOTIFICATION_PREFERENCES,
  isValidNotificationCategory,
  isValidReminderTimingOption,
} from "@/lib/notifications/types"

// Enforce server-only execution guard
if (typeof window !== "undefined") {
  throw new Error(
    "[SECURITY VIOLATION] notification-preferences utility must only be executed in a server environment."
  )
}

/**
 * Validates whether a given string is a valid UUID.
 */
function isValidUUID(id: string): boolean {
  return (
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  )
}

/**
 * Maps a database row into a complete typed NotificationPreferences record,
 * applying default values for any missing or null properties.
 */
export function mapRowToPreferences(
  row: Partial<NotificationPreferences> | null | undefined
): NotificationPreferences {
  if (!row || typeof row !== "object") {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }

  const rawReminderDays = (row as Record<string, unknown>).reminder_days_before
  const reminder_days_before: ReminderTimingOption = isValidReminderTimingOption(rawReminderDays)
    ? (rawReminderDays as ReminderTimingOption)
    : DEFAULT_NOTIFICATION_PREFERENCES.reminder_days_before

  return {
    personal_reminders:
      typeof row.personal_reminders === "boolean"
        ? row.personal_reminders
        : DEFAULT_NOTIFICATION_PREFERENCES.personal_reminders,
    personal_updates:
      typeof row.personal_updates === "boolean"
        ? row.personal_updates
        : DEFAULT_NOTIFICATION_PREFERENCES.personal_updates,
    partner_daily_notes:
      typeof row.partner_daily_notes === "boolean"
        ? row.partner_daily_notes
        : DEFAULT_NOTIFICATION_PREFERENCES.partner_daily_notes,
    partner_cycle_updates:
      typeof row.partner_cycle_updates === "boolean"
        ? row.partner_cycle_updates
        : DEFAULT_NOTIFICATION_PREFERENCES.partner_cycle_updates,
    partner_activity:
      typeof row.partner_activity === "boolean"
        ? row.partner_activity
        : DEFAULT_NOTIFICATION_PREFERENCES.partner_activity,
    partner_connection:
      typeof row.partner_connection === "boolean"
        ? row.partner_connection
        : DEFAULT_NOTIFICATION_PREFERENCES.partner_connection,
    shared_reminders:
      typeof row.shared_reminders === "boolean"
        ? row.shared_reminders
        : DEFAULT_NOTIFICATION_PREFERENCES.shared_reminders,
    shared_updates:
      typeof row.shared_updates === "boolean"
        ? row.shared_updates
        : DEFAULT_NOTIFICATION_PREFERENCES.shared_updates,
    system_notifications:
      typeof row.system_notifications === "boolean"
        ? row.system_notifications
        : DEFAULT_NOTIFICATION_PREFERENCES.system_notifications,
    security_notifications:
      typeof row.security_notifications === "boolean"
        ? row.security_notifications
        : DEFAULT_NOTIFICATION_PREFERENCES.security_notifications,
    period_reminders:
      typeof row.period_reminders === "boolean"
        ? row.period_reminders
        : DEFAULT_NOTIFICATION_PREFERENCES.period_reminders,
    fertile_window_reminders:
      typeof row.fertile_window_reminders === "boolean"
        ? row.fertile_window_reminders
        : DEFAULT_NOTIFICATION_PREFERENCES.fertile_window_reminders,
    ovulation_reminders:
      typeof row.ovulation_reminders === "boolean"
        ? row.ovulation_reminders
        : DEFAULT_NOTIFICATION_PREFERENCES.ovulation_reminders,
    cycle_transition_reminders:
      typeof row.cycle_transition_reminders === "boolean"
        ? row.cycle_transition_reminders
        : DEFAULT_NOTIFICATION_PREFERENCES.cycle_transition_reminders,
    missed_period_reminders:
      typeof row.missed_period_reminders === "boolean"
        ? row.missed_period_reminders
        : DEFAULT_NOTIFICATION_PREFERENCES.missed_period_reminders,
    reminder_days_before,
  }
}

/**
 * Retrieves all notification preferences for a specific recipient user.
 * If no row exists yet or if the database query fails, returns safe default preferences.
 *
 * @param userId - Supabase auth user UUID
 * @returns Complete NotificationPreferences object
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  if (!userId || !isValidUUID(userId)) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("notification_preferences")
      .select(
        "personal_reminders, personal_updates, partner_daily_notes, partner_cycle_updates, partner_activity, partner_connection, shared_reminders, shared_updates, system_notifications, security_notifications, period_reminders, fertile_window_reminders, ovulation_reminders, cycle_transition_reminders, missed_period_reminders, reminder_days_before"
      )
      .eq("user_id", userId)
      .maybeSingle()

    if (error || !data) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES }
    }

    return mapRowToPreferences(data as unknown as Partial<NotificationPreferences>)
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }
}

/**
 * Checks whether a specific notification category is enabled for a recipient user.
 *
 * @param userId - Supabase auth user UUID
 * @param category - Typed notification category
 * @returns boolean - true if enabled or default; false if explicitly disabled
 */
export async function isNotificationEnabled(
  userId: string,
  category: NotificationCategory
): Promise<boolean> {
  if (!isValidNotificationCategory(category)) {
    return false
  }

  const prefs = await getNotificationPreferences(userId)
  return prefs[category] ?? true
}

/**
 * Alias for isNotificationEnabled to satisfy alternative naming conventions.
 */
export async function getNotificationPreference(
  userId: string,
  category: NotificationCategory
): Promise<boolean> {
  return isNotificationEnabled(userId, category)
}
