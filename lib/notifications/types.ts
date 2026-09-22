/**
 * Seijun Notification Preferences Type Definitions & Metadata Architecture
 *
 * Centralized, type-safe notification category model for user preferences.
 * Future phases (Phase 18 Smart Cycle Reminders, Phase 19 Partner Connection,
 * Phase 20 Shared Reminders) consume these categories directly.
 */

export type NotificationCategory =
  | "personal_reminders"
  | "personal_updates"
  | "partner_daily_notes"
  | "partner_cycle_updates"
  | "partner_activity"
  | "partner_connection"
  | "shared_reminders"
  | "shared_updates"
  | "system_notifications"
  | "security_notifications"

export type NotificationGroup = "personal" | "partner" | "shared" | "system"

export interface NotificationCategoryConfig {
  key: NotificationCategory
  group: NotificationGroup
  label: string
  description: string
  defaultEnabled: boolean
}

export type NotificationPreferences = Record<NotificationCategory, boolean>

export const ALL_NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  "personal_reminders",
  "personal_updates",
  "partner_daily_notes",
  "partner_cycle_updates",
  "partner_activity",
  "partner_connection",
  "shared_reminders",
  "shared_updates",
  "system_notifications",
  "security_notifications",
] as const

export const NOTIFICATION_CATEGORIES: Record<NotificationCategory, NotificationCategoryConfig> = {
  personal_reminders: {
    key: "personal_reminders",
    group: "personal",
    label: "Personal Reminders",
    description: "Period onset predictions, fertile window alerts, and cycle phase notifications.",
    defaultEnabled: true,
  },
  personal_updates: {
    key: "personal_updates",
    group: "personal",
    label: "Personal Updates",
    description: "Algorithmic cycle insights, baseline statistics, and wellness patterns.",
    defaultEnabled: true,
  },
  partner_daily_notes: {
    key: "partner_daily_notes",
    group: "partner",
    label: "Daily Notes",
    description: "Notify me when my partner creates or edits a daily note.",
    defaultEnabled: true,
  },
  partner_cycle_updates: {
    key: "partner_cycle_updates",
    group: "partner",
    label: "Cycle Updates",
    description: "Notify me when my partner enters a new cycle phase or logs period start.",
    defaultEnabled: true,
  },
  partner_activity: {
    key: "partner_activity",
    group: "partner",
    label: "Partner Activity",
    description: "Notify me when my partner logs daily symptoms, moods, or wellness entries.",
    defaultEnabled: true,
  },
  partner_connection: {
    key: "partner_connection",
    group: "partner",
    label: "Connection Activity",
    description: "Partner pairing invitations, sync confirmations, and connection state changes.",
    defaultEnabled: true,
  },
  shared_reminders: {
    key: "shared_reminders",
    group: "shared",
    label: "Shared Reminders",
    description: "Synchronized reminders for intimate appointments, cycle milestones, and mutual dates.",
    defaultEnabled: true,
  },
  shared_updates: {
    key: "shared_updates",
    group: "shared",
    label: "Shared Updates",
    description: "Updates to shared routines, mutual calendars, and collaborative plans.",
    defaultEnabled: true,
  },
  system_notifications: {
    key: "system_notifications",
    group: "system",
    label: "System Notifications",
    description: "Application updates, critical service announcements, and maintenance alerts.",
    defaultEnabled: true,
  },
  security_notifications: {
    key: "security_notifications",
    group: "system",
    label: "Security Notifications",
    description: "Sign-in alerts, device authorizations, and account security notifications.",
    defaultEnabled: true,
  },
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Readonly<NotificationPreferences> = {
  personal_reminders: true,
  personal_updates: true,
  partner_daily_notes: true,
  partner_cycle_updates: true,
  partner_activity: true,
  partner_connection: true,
  shared_reminders: true,
  shared_updates: true,
  system_notifications: true,
  security_notifications: true,
}

export const NOTIFICATION_GROUPS: {
  id: NotificationGroup
  title: string
  description: string
  categories: NotificationCategory[]
}[] = [
  {
    id: "personal",
    title: "Personal",
    description: "Alerts and reminders calculated specifically for your cycle and wellness.",
    categories: ["personal_reminders", "personal_updates"],
  },
  {
    id: "partner",
    title: "Partner",
    description: "Push alerts triggered by shared partner logs, phase changes, and notes.",
    categories: [
      "partner_daily_notes",
      "partner_cycle_updates",
      "partner_activity",
      "partner_connection",
    ],
  },
  {
    id: "shared",
    title: "Shared",
    description: "Mutual calendar alerts, synchronized milestones, and shared reminders.",
    categories: ["shared_reminders", "shared_updates"],
  },
  {
    id: "system",
    title: "System & Security",
    description: "Crucial service notices, software updates, and account security alerts.",
    categories: ["system_notifications", "security_notifications"],
  },
]

/**
 * Type guard to validate whether an unknown value is a valid NotificationCategory.
 */
export function isValidNotificationCategory(val: unknown): val is NotificationCategory {
  return typeof val === "string" && ALL_NOTIFICATION_CATEGORIES.includes(val as NotificationCategory)
}

export interface NotificationPreferenceActionResponse {
  ok: boolean
  category?: NotificationCategory
  enabled?: boolean
  error?: string
  preferences?: NotificationPreferences
}
