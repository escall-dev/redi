"use server"

/**
 * Seijun Test Web Push Sending Action
 *
 * Provides a secure, explicitly invoked server action for sending a test Web Push notification
 * to an authenticated user's persisted subscription.
 *
 * SECURITY INVARIANTS:
 * 1. Derives user_id exclusively from verified Supabase Auth session.
 * 2. Uses standard authenticated Supabase client (service-role key is never used).
 * 3. Never called automatically on page loads, logins, or service worker events.
 * 4. Never exposes VAPID private key or subscription secrets to the client.
 * 5. Automatically cleans up expired/rejected subscriptions (HTTP 404/410) under RLS.
 */

import { createClient } from "@/lib/supabase/server"
import { sendWebPushNotification } from "@/lib/server/web-push"
import type { PushNotificationPayload, SendPushResult } from "@/lib/push/types"

export interface SendTestPushActionResponse {
  ok: boolean
  reason?: string
  error?: string
  statusCode?: number
  cleanedUpExpired?: boolean
}

/**
 * Explicitly sends a test notification to a persisted subscription belonging to the authenticated user.
 *
 * @param subscriptionId - Optional specific subscription ID. If omitted, sends to the user's most recent subscription.
 * @param customPayload - Optional custom payload. If omitted, uses the standard test payload.
 */
export async function sendTestPushNotificationAction(
  subscriptionId?: string,
  customPayload?: Partial<PushNotificationPayload>
): Promise<SendTestPushActionResponse> {
  // 1. Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return {
      ok: false,
      reason: "unauthenticated",
      error: "Authentication required to send push notifications.",
    }
  }

  // 2. Fetch target persisted subscription under user ownership
  let query = supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id)

  if (subscriptionId && typeof subscriptionId === "string") {
    query = query.eq("id", subscriptionId.trim())
  } else {
    // Order by most recently updated/created subscription
    query = query.order("updated_at", { ascending: false }).limit(1)
  }

  const { data: subscriptions, error: dbError } = await query

  if (dbError) {
    console.error("[sendTestPushNotificationAction] Database query error:", dbError.message)
    return {
      ok: false,
      reason: "database_error",
      error: "Failed to retrieve push subscription from database.",
    }
  }

  const targetSub = subscriptions?.[0]
  if (!targetSub) {
    return {
      ok: false,
      reason: "subscription_not_found",
      error: "No active push subscription found for this account.",
    }
  }

  // 3. Prepare payload
  const payload: PushNotificationPayload = {
    title: customPayload?.title?.trim() || "Seijun Push Test",
    body: customPayload?.body?.trim() || "Your Seijun push notifications are working.",
    url: customPayload?.url?.trim() || "/dashboard",
    icon: customPayload?.icon?.trim() || "/icons/icon-192.png",
    badge: customPayload?.badge?.trim() || "/icons/icon-192.png",
    tag: customPayload?.tag?.trim() || "seijun-test-push",
    data: {
      url: customPayload?.url?.trim() || "/dashboard",
      type: "test_notification",
      timestamp: Date.now(),
      ...(customPayload?.data || {}),
    },
  }

  // 4. Send notification via server sending infrastructure
  const result: SendPushResult = await sendWebPushNotification(
    {
      endpoint: targetSub.endpoint,
      p256dh: targetSub.p256dh,
      auth: targetSub.auth,
    },
    payload
  )

  // 5. Handle expired subscription cleanup (404/410)
  let cleanedUpExpired = false
  if (!result.ok && result.isExpired) {
    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("id", targetSub.id)
      .eq("user_id", user.id)

    if (!deleteError) {
      cleanedUpExpired = true
      console.log(`[sendTestPushNotificationAction] Removed expired subscription ${targetSub.id}`)
    } else {
      console.warn(
        `[sendTestPushNotificationAction] Failed to remove expired subscription: ${deleteError.message}`
      )
    }
  }

  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      error: result.error,
      statusCode: result.statusCode,
      cleanedUpExpired,
    }
  }

  return {
    ok: true,
    statusCode: result.statusCode,
  }
}
