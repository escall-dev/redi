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

    const [eventsRes, unreadRes, pendingInvitesRes] = await Promise.all([
      query,
      supabase
        .from("notification_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "sent")
        .is("read_at", null),
      supabase
        .from("partner_invitations")
        .select("id, inviter_user_id, status, created_at, expires_at")
        .eq("invitee_user_id", user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
    ])

    if (eventsRes.error) {
      return { ok: false, notifications: [], unreadCount: 0, error: eventsRes.error.message }
    }

    const existingEvents = eventsRes.data || []
    const pendingInvites = pendingInvitesRes.data || []

    // Map any pending partner invitations that are not already in notification_events
    const syntheticInviteEvents: NotificationEventRow[] = []
    for (const invite of pendingInvites) {
      const alreadyHasEvent = existingEvents.some(
        (e) => e.type === "partner_invitation" && (e.url.includes(invite.id) || !e.read_at)
      )

      if (!alreadyHasEvent) {
        let inviterUsername = "partner"
        let inviterDisplayName = "Partner"

        const { data: invProfile } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("user_id", invite.inviter_user_id)
          .maybeSingle()

        if (invProfile) {
          inviterUsername = invProfile.username || "partner"
          inviterDisplayName = invProfile.display_name || inviterUsername
        }

        syntheticInviteEvents.push({
          id: `partner-invite-${invite.id}`,
          user_id: user.id,
          cycle_id: null,
          type: "partner_invitation",
          scheduled_for: invite.created_at,
          sent_at: invite.created_at,
          status: "sent",
          title: "Partner Invitation",
          body:
            inviterDisplayName !== inviterUsername
              ? `${inviterDisplayName} (@${inviterUsername}) sent you a partner invitation.`
              : `@${inviterUsername} sent you a partner invitation.`,
          url: "/settings/partner",
          metadata: { invitationId: invite.id, inviterUsername },
          read_at: null,
          created_at: invite.created_at,
          updated_at: invite.created_at,
        })
      }
    }

    // Merge and sort all notifications by created_at descending
    const allNotifications = [...syntheticInviteEvents, ...existingEvents].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const finalNotifications = options?.unreadOnly
      ? allNotifications.filter((n) => !n.read_at)
      : allNotifications.slice(0, limit)

    const finalUnreadCount =
      (unreadRes.count ?? 0) + syntheticInviteEvents.filter((e) => !e.read_at).length

    return {
      ok: true,
      notifications: finalNotifications,
      unreadCount: finalUnreadCount,
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

    const [unreadRes, pendingInvitesRes] = await Promise.all([
      supabase
        .from("notification_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "sent")
        .is("read_at", null),
      supabase
        .from("partner_invitations")
        .select("id", { count: "exact", head: true })
        .eq("invitee_user_id", user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString()),
    ])

    return (unreadRes.count ?? 0) + (pendingInvitesRes.count ?? 0)
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
    if (eventId.startsWith("partner-invite-")) {
      return { ok: true }
    }

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
    if (eventId.startsWith("partner-invite-")) {
      return { ok: true }
    }

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
