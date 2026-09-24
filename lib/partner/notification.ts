import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
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
