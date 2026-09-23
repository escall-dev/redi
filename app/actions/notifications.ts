"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Database } from "@/lib/supabase/types"

export type NotificationEventRow = Database["public"]["Tables"]["notification_events"]["Row"]

export interface NotificationsListResult {
  ok: boolean
  notifications: NotificationEventRow[]
  unreadCount: number
  error?: string
}

/**
 * Server Action: Fetches delivered notification history for the authenticated user.
 */
export async function getUserNotificationsAction(options?: {
  limit?: number
  unreadOnly?: boolean
}): Promise<NotificationsListResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return { ok: false, notifications: [], unreadCount: 0, error: "Unauthenticated" }
  }

  const limit = options?.limit ?? 50

  try {
    let query = supabase
      .from("notification_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (options?.unreadOnly) {
      query = query.is("read_at", null)
    }

    const [eventsRes, unreadRes] = await Promise.all([
      query,
      supabase
        .from("notification_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "sent")
        .is("read_at", null),
    ])

    if (eventsRes.error) {
      return { ok: false, notifications: [], unreadCount: 0, error: eventsRes.error.message }
    }

    return {
      ok: true,
      notifications: eventsRes.data || [],
      unreadCount: unreadRes.count ?? 0,
    }
  } catch (err: unknown) {
    return {
      ok: false,
      notifications: [],
      unreadCount: 0,
      error: err instanceof Error ? err.message : "Failed to retrieve notifications.",
    }
  }
}

/**
 * Server Action: Returns the current count of unread notifications for the caller.
 */
export async function getUnreadNotificationCountAction(): Promise<number> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return 0

    const { count } = await supabase
      .from("notification_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "sent")
      .is("read_at", null)

    return count ?? 0
  } catch {
    return 0
  }
}

/**
 * Server Action: Marks a single notification as read.
 */
export async function markNotificationAsReadAction(
  eventId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!eventId) return { ok: false, error: "Missing eventId." }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { ok: false, error: "Unauthenticated" }

    const { error } = await supabase
      .from("notification_events")
      .update({ read_at: new Date().toISOString() })
      .eq("id", eventId)
      .eq("user_id", user.id)

    if (error) return { ok: false, error: error.message }

    revalidatePath("/notifications")
    return { ok: true }
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to mark notification as read.",
    }
  }
}

/**
 * Server Action: Marks all delivered notifications as read for the authenticated user.
 */
export async function markAllNotificationsAsReadAction(): Promise<{
  ok: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { ok: false, error: "Unauthenticated" }

    const { error } = await supabase
      .from("notification_events")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "sent")
      .is("read_at", null)

    if (error) return { ok: false, error: error.message }

    revalidatePath("/notifications")
    return { ok: true }
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to mark all as read.",
    }
  }
}

/**
 * Server Action: Deletes a notification event from history.
 */
export async function deleteNotificationAction(
  eventId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!eventId) return { ok: false, error: "Missing eventId." }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { ok: false, error: "Unauthenticated" }

    const { error } = await supabase
      .from("notification_events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", user.id)

    if (error) return { ok: false, error: error.message }

    revalidatePath("/notifications")
    return { ok: true }
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete notification.",
    }
  }
}
