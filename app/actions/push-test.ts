"use server"

/**
 * Seijun End-to-End Web Push Test Actions (Phase 17.9)
 *
 * Provides explicit, authenticated server actions for validating end-to-end push delivery:
 * 1. Test A (Current Account): Sends test notification to all subscriptions belonging
 *    to the authenticated user across multiple devices (e.g. Chrome, Desktop PWA, Mobile PWA).
 * 2. Test B (Global Broadcast): Test-only administrative pathway to broadcast the test
 *    notification across all accounts, strictly server-authorized and environment-gated.
 *
 * SECURITY INVARIANTS:
 * - User identity is derived strictly from verified Supabase Auth session.
 * - Global test is protected: forbidden for normal users in production.
 * - Standard authenticated client only; service-role key is NEVER used.
 * - Zero automatic triggers: must only be invoked upon explicit user/admin interaction.
 * - Zero credential exposure: p256dh, auth, private keys, and full URLs are never returned.
 * - Automatic cleanup of expired (HTTP 404/410) subscriptions.
 * - Test notification payload is strictly non-sensitive (no cycle, symptom, health data).
 */

import { createClient } from "@/lib/supabase/server"
import { sendWebPushNotification } from "@/lib/server/web-push"
import type {
  PushDeliverySummary,
  PushNotificationPayload,
  SendPushResult,
} from "@/lib/push/types"

/**
 * Standard unmistakable test-only notification payload.
 * Strictly free of user-specific sensitive data (no cycles, health, notes, mood, partner info).
 */
const SEIJUN_TEST_PAYLOAD: PushNotificationPayload = {
  title: "Seijun Test Notification",
  body: "This is a test broadcast from Seijun. If you're seeing this, push notifications are working on this device.",
  url: "/dashboard",
  icon: "/icons/icon-192.png",
  badge: "/icons/icon-192.png",
  tag: "seijun-push-test",
  data: {
    url: "/dashboard",
    type: "test_notification",
  },
}

// ---------------------------------------------------------------------------
// TEST A: Current Account / Multiple Device Test
// ---------------------------------------------------------------------------

/**
 * Test A: Explicitly sends a test notification to all persisted subscriptions
 * owned by the currently authenticated user.
 *
 * Validates the normal production direction:
 * one user -> multiple devices -> multiple push subscriptions.
 */
export async function sendCurrentAccountTestPushAction(
  customPayload?: Partial<PushNotificationPayload>
): Promise<PushDeliverySummary> {
  // 1. Authenticate caller
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return {
      ok: false,
      attempted: 0,
      delivered: 0,
      expired: 0,
      failed: 0,
      reason: "unauthenticated",
      error: "Authentication required to send push notifications.",
    }
  }

  // 2. Fetch all persisted subscriptions under user ownership
  const { data: subscriptions, error: dbError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id)

  if (dbError) {
    console.error("[sendCurrentAccountTestPushAction] Database query error:", dbError.message)
    return {
      ok: false,
      attempted: 0,
      delivered: 0,
      expired: 0,
      failed: 0,
      reason: "database_error",
      error: "Failed to retrieve push subscriptions from database.",
    }
  }

  if (!subscriptions || subscriptions.length === 0) {
    return {
      ok: false,
      attempted: 0,
      delivered: 0,
      expired: 0,
      failed: 0,
      reason: "no_subscriptions",
      error: "No active push subscriptions found for this account. Enable notifications first.",
    }
  }

  // 3. Construct test payload
  const payload: PushNotificationPayload = {
    ...SEIJUN_TEST_PAYLOAD,
    title: customPayload?.title?.trim() || SEIJUN_TEST_PAYLOAD.title,
    body: customPayload?.body?.trim() || SEIJUN_TEST_PAYLOAD.body,
    url: customPayload?.url?.trim() || SEIJUN_TEST_PAYLOAD.url,
    tag: customPayload?.tag?.trim() || SEIJUN_TEST_PAYLOAD.tag,
    data: {
      ...SEIJUN_TEST_PAYLOAD.data,
      ...(customPayload?.data || {}),
      timestamp: Date.now(),
    },
  }

  let delivered = 0
  let expired = 0
  let failed = 0

  // 4. Iterate over each persisted subscription for this account
  for (const sub of subscriptions) {
    const result: SendPushResult = await sendWebPushNotification(
      {
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
      payload
    )

    if (result.ok) {
      delivered++
    } else if (result.isExpired) {
      expired++
      // Safely remove expired subscription strictly scoped to user.id
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", sub.id)
        .eq("user_id", user.id)

      if (deleteError) {
        console.warn(
          `[sendCurrentAccountTestPushAction] Failed to delete expired subscription ${sub.id}: ${deleteError.message}`
        )
      } else {
        console.log(`[sendCurrentAccountTestPushAction] Removed expired subscription ${sub.id}`)
      }
    } else {
      failed++
    }
  }

  return {
    ok: delivered > 0,
    attempted: subscriptions.length,
    delivered,
    expired,
    failed,
  }
}

// ---------------------------------------------------------------------------
// TEST B: All-Account Test Broadcast (Protected Admin/Dev Pathway)
// ---------------------------------------------------------------------------

/**
 * Test B: Clearly test-only administrative/development pathway to broadcast
 * the test notification to ALL currently persisted subscriptions across ALL accounts.
 *
 * SECURITY ENFORCEMENT:
 * - Restricted to development environment OR an authorized server secret.
 * - Ordinary users in production cannot trigger this broadcast.
 * - Never returns subscription credentials or private user information.
 * - Does NOT use privileged admin database keys.
 */
export async function sendGlobalTestPushBroadcastAction(
  adminSecret?: string
): Promise<PushDeliverySummary> {
  // 1. Server-side Authorization Enforcement
  const isDev = process.env.NODE_ENV === "development"
  const configuredSecret = process.env.ADMIN_TEST_SECRET || process.env.ADMIN_PUSH_KEY
  const isAuthorizedSecret = Boolean(configuredSecret && adminSecret === configuredSecret)

  if (!isDev && !isAuthorizedSecret) {
    return {
      ok: false,
      attempted: 0,
      delivered: 0,
      expired: 0,
      failed: 0,
      reason: "forbidden",
      error: "Global broadcast test is restricted to authorized administrators.",
    }
  }

  const supabase = await createClient()

  // 2. Fetch all subscriptions across accounts
  // Attempts security definer RPC if available, otherwise queries public.push_subscriptions
  let subscriptions: Array<{ id: string; user_id?: string; endpoint: string; p256dh: string; auth: string }> = []

  const rpcResult = await supabase.rpc("get_all_push_subscriptions_for_admin_test")
  if (rpcResult.data && !rpcResult.error) {
    subscriptions = rpcResult.data
  } else {
    // Standard query fallback
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")

    if (error) {
      console.error("[sendGlobalTestPushBroadcastAction] Subscriptions query error:", error.message)
      return {
        ok: false,
        attempted: 0,
        delivered: 0,
        expired: 0,
        failed: 0,
        reason: "database_error",
        error: "Failed to retrieve subscriptions for broadcast test.",
      }
    }
    subscriptions = data || []
  }

  if (subscriptions.length === 0) {
    return {
      ok: false,
      attempted: 0,
      delivered: 0,
      expired: 0,
      failed: 0,
      reason: "no_subscriptions",
      error: "No persisted push subscriptions found in the database.",
    }
  }

  let delivered = 0
  let expired = 0
  let failed = 0

  // 3. Iterate through all subscriptions across accounts
  for (const sub of subscriptions) {
    const result: SendPushResult = await sendWebPushNotification(
      {
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
      SEIJUN_TEST_PAYLOAD
    )

    if (result.ok) {
      delivered++
    } else if (result.isExpired) {
      expired++
      // Clean up expired subscription scoped to exact record ID
      const rpcDelete = await supabase.rpc("delete_expired_push_subscription_admin", {
        target_id: sub.id,
      })

      if (rpcDelete.error) {
        // Fallback to table delete
        await supabase.from("push_subscriptions").delete().eq("id", sub.id)
      }
      console.log(`[sendGlobalTestPushBroadcastAction] Cleaned up expired subscription ${sub.id}`)
    } else {
      failed++
    }
  }

  return {
    ok: delivered > 0,
    attempted: subscriptions.length,
    delivered,
    expired,
    failed,
  }
}

// ---------------------------------------------------------------------------
// Backward Compatibility Wrapper (Phase 17.8)
// ---------------------------------------------------------------------------

export interface SendTestPushActionResponse {
  ok: boolean
  reason?: string
  error?: string
  statusCode?: number
  cleanedUpExpired?: boolean
  attempted?: number
  delivered?: number
  expired?: number
  failed?: number
}

/**
 * Backward compatibility wrapper for Phase 17.8 callers and scripts.
 */
export async function sendTestPushNotificationAction(
  subscriptionId?: string,
  customPayload?: Partial<PushNotificationPayload>
): Promise<SendTestPushActionResponse> {
  const summary = await sendCurrentAccountTestPushAction(customPayload)
  return {
    ok: summary.ok,
    reason: summary.reason,
    error: summary.error,
    statusCode: summary.ok ? 201 : summary.expired > 0 ? 410 : 500,
    cleanedUpExpired: summary.expired > 0,
    attempted: summary.attempted,
    delivered: summary.delivered,
    expired: summary.expired,
    failed: summary.failed,
  }
}
