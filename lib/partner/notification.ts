import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, CycleReminderType } from "@/lib/supabase/types"
import { sendWebPushNotification } from "@/lib/server/web-push"

interface SendPartnerInvitationNotificationParams {
  supabase: SupabaseClient<Database>
  inviteeUserId: string
  inviterUserId: string
  inviterUsername: string
  inviterDisplayName?: string | null
  invitationId?: string
}

/**
 * Sends both an in-app notification event and an immediate Web Push notification
 * to the invited partner when an invitation is dispatched.
 */
export async function sendPartnerInvitationNotification({
  supabase,
  inviteeUserId,
  inviterUserId,
  inviterUsername,
  inviterDisplayName,
  invitationId,
}: SendPartnerInvitationNotificationParams): Promise<{
  inAppDelivered: boolean
  pushDelivered: boolean
}> {
  let inAppDelivered = false
  let pushDelivered = false

  const displayName = inviterDisplayName || inviterUsername
  const body =
    inviterDisplayName && inviterDisplayName !== inviterUsername
      ? `${inviterDisplayName} (@${inviterUsername}) sent you a partner invitation.`
      : `@${inviterUsername} sent you a partner invitation.`

  // 1. Deliver in-app notification event
  try {
    const { data: eventId, error: rpcErr } = await supabase.rpc("notify_partner_invitation", {
      p_invitee_user_id: inviteeUserId,
      p_inviter_user_id: inviterUserId,
      p_inviter_username: inviterUsername,
      p_inviter_display_name: inviterDisplayName || "",
    })

    if (!rpcErr && eventId) {
      inAppDelivered = true
    } else {
      // Fallback insert if RPC not installed
      const { error: insertErr } = await supabase.from("notification_events").insert({
        user_id: inviteeUserId,
        type: "partner_invitation",
        title: "Partner Invitation",
        body,
        url: "/settings/partner",
        status: "sent",
        scheduled_for: new Date().toISOString(),
        metadata: {
          invitationId,
          inviterUsername,
          inviterDisplayName: displayName,
        },
      })
      if (!insertErr) {
        inAppDelivered = true
      }
    }
  } catch (err) {
    console.error("[sendPartnerInvitationNotification] In-app notification delivery error:", err)
  }

  // 2. Check partner notification preferences for invitee
  try {
    const { data: prefRow } = await supabase
      .from("notification_preferences")
      .select("partner_connection")
      .eq("user_id", inviteeUserId)
      .maybeSingle()

    // Respect user preference: if partner_connection is explicitly false, suppress push
    if (prefRow && prefRow.partner_connection === false) {
      return { inAppDelivered, pushDelivered: false }
    }

    // 3. Query push subscriptions for invitee
    let subscriptions: { endpoint: string; p256dh: string; auth: string; id?: string }[] = []

    const { data: rpcSubs, error: rpcSubsErr } = await supabase.rpc("get_partner_push_subscriptions", {
      p_target_user_id: inviteeUserId,
    })

    if (!rpcSubsErr && Array.isArray(rpcSubs) && rpcSubs.length > 0) {
      subscriptions = rpcSubs
    } else {
      const { data: directSubs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", inviteeUserId)

      if (directSubs && directSubs.length > 0) {
        subscriptions = directSubs
      }
    }

    // 4. Send Web Push to all active devices
    if (subscriptions.length > 0) {
      const payload = {
        title: "Partner Invitation",
        body,
        url: "/settings/partner",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: `seijun-partner-invitation-${inviterUserId}`,
        sound: "/sounds/notification.wav",
        data: {
          url: "/settings/partner",
          type: "partner_invitation",
          invitationId,
          inviterUsername,
          inviterDisplayName: displayName,
        },
      }

      for (const sub of subscriptions) {
        try {
          const res = await sendWebPushNotification(
            {
              endpoint: sub.endpoint,
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
            payload
          )
          if (res.ok) {
            pushDelivered = true
          }
        } catch {
          // Ignore individual subscription push errors
        }
      }
    }
  } catch (pushErr) {
    console.error("[sendPartnerInvitationNotification] Web push notification error:", pushErr)
  }

  return { inAppDelivered, pushDelivered }
}

export interface SendPartnerCoManagementNotificationParams {
  supabase: SupabaseClient<Database>
  recipientUserId: string
  actorUsername: string
  category: "partner_cycle_updates" | "partner_daily_notes"
  title: string
  body: string
  url: string
}

/**
 * Dispatches a privacy-preserving notification to a cycle partner when an authorized
 * co-management mutation or significant shared cycle event occurs.
 *
 * Guarantees:
 * - Checks and respects recipient's notification_preferences
 * - Strictly avoids leaking sensitive cycle, flow, symptom, or note contents
 * - Dispatches both in-app notification_events and Web Push (if subscribed)
 */
export async function sendPartnerCoManagementNotification({
  supabase,
  recipientUserId,
  actorUsername,
  category,
  title,
  body,
  url,
}: SendPartnerCoManagementNotificationParams): Promise<{
  inAppDelivered: boolean
  pushDelivered: boolean
}> {
  let inAppDelivered = false
  let pushDelivered = false

  try {
    // 1. Check recipient's notification preferences
    const { data: prefRow } = await supabase
      .from("notification_preferences")
      .select("partner_cycle_updates, partner_daily_notes")
      .eq("user_id", recipientUserId)
      .maybeSingle()

    // Respect recipient's preference: if the category is explicitly false, suppress notification
    if (prefRow) {
      if (category === "partner_cycle_updates" && prefRow.partner_cycle_updates === false) {
        return { inAppDelivered: false, pushDelivered: false }
      }
      if (category === "partner_daily_notes" && prefRow.partner_daily_notes === false) {
        return { inAppDelivered: false, pushDelivered: false }
      }
    }

    // 2. Deliver in-app notification event
    const { error: insertErr } = await supabase.from("notification_events").insert({
      user_id: recipientUserId,
      type: category as CycleReminderType,
      title,
      body,
      url,
      status: "sent",
      scheduled_for: new Date().toISOString(),
      metadata: {
        partnerUsername: actorUsername,
      },
    })

    if (!insertErr) {
      inAppDelivered = true
    }

    // 3. Query push subscriptions for recipient
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", recipientUserId)

    // 4. Send Web Push to all active devices
    if (subscriptions && subscriptions.length > 0) {
      const payload = {
        title,
        body,
        url,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: `seijun-${category}-${recipientUserId}`,
        sound: "/sounds/notification.wav",
        data: {
          url,
          type: category,
          partnerUsername: actorUsername,
        },
      }

      for (const sub of subscriptions) {
        try {
          const res = await sendWebPushNotification(
            {
              endpoint: sub.endpoint,
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
            payload
          )
          if (res.ok) {
            pushDelivered = true
          }
        } catch {
          // Ignore individual subscription errors
        }
      }
    }
  } catch (err) {
    console.error("[sendPartnerCoManagementNotification] Error:", err)
  }

  return { inAppDelivered, pushDelivered }
}

