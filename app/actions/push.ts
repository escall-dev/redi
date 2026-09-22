"use server"

import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import type { PushActionResponse, PushSubscriptionPayload } from "@/lib/push/types"

/**
 * Validates whether the provided string is a plausible, well-formed Web Push endpoint URL.
 */
function isValidPushEndpoint(endpointStr: string): boolean {
  if (!endpointStr || typeof endpointStr !== "string" || endpointStr.length > 2048) {
    return false
  }

  try {
    const url = new URL(endpointStr)
    const isHttps = url.protocol === "https:"
    const isLocalDev =
      process.env.NODE_ENV === "development" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")

    return isHttps || isLocalDev
  } catch {
    return false
  }
}

/**
 * Validates Base64 or Base64URL encoded crypto keys.
 */
function isValidBase64Key(keyStr: string, minLength: number): boolean {
  if (!keyStr || typeof keyStr !== "string" || keyStr.length < minLength || keyStr.length > 512) {
    return false
  }

  // Base64 and Base64URL characters with optional padding
  return /^[A-Za-z0-9+/=_-]+$/.test(keyStr)
}

/**
 * Server Action: Securely persist or update a Web Push subscription in Supabase.
 *
 * SECURITY INVARIANTS:
 * 1. Derives user_id exclusively from verified Supabase Auth session.
 * 2. Never accepts user_id from client payload.
 * 3. Enforces RLS with authenticated client (service-role key is never used).
 * 4. Prevents cross-account endpoint hijacking by detecting unique constraint violations
 *    when an endpoint exists under another account.
 * 5. Reuses/updates existing subscriptions if owned by the caller.
 * 6. Supports multiple devices per user (user_id is not unique in public.push_subscriptions).
 */
export async function savePushSubscriptionAction(
  payload: PushSubscriptionPayload
): Promise<PushActionResponse> {
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
      error: "Authentication required to register push subscriptions.",
    }
  }

  // 2. Validate payload structure
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      reason: "invalid_payload",
      error: "Subscription payload is missing or invalid.",
    }
  }

  const endpoint = payload.endpoint?.trim()
  const p256dh = payload.p256dh?.trim()
  const auth = payload.auth?.trim()

  if (!endpoint || !isValidPushEndpoint(endpoint)) {
    return {
      ok: false,
      reason: "invalid_payload",
      error: "A valid HTTPS Web Push endpoint URL is required.",
    }
  }

  if (!p256dh || !isValidBase64Key(p256dh, 20)) {
    return {
      ok: false,
      reason: "invalid_payload",
      error: "A valid p256dh cryptographic public key is required.",
    }
  }

  if (!auth || !isValidBase64Key(auth, 10)) {
    return {
      ok: false,
      reason: "invalid_payload",
      error: "A valid auth authentication secret is required.",
    }
  }

  // 3. Extract optional client/server metadata
  let userAgent = payload.userAgent?.trim() || null
  if (!userAgent) {
    try {
      const headerList = await headers()
      userAgent = headerList.get("user-agent") || null
    } catch {
      // Ignore header extraction failure
    }
  }
  const deviceName = payload.deviceName?.trim() || null

  // 4. Check if endpoint is already registered for this authenticated user
  const { data: existing, error: selectError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id")
    .eq("endpoint", endpoint)
    .maybeSingle()

  if (selectError) {
    console.error("[savePushSubscriptionAction] Select error:", selectError.message)
    return {
      ok: false,
      reason: "database_error",
      error: "Failed to verify existing subscription.",
    }
  }

  // 5. Update existing record if owned by caller
  if (existing) {
    const { error: updateError } = await supabase
      .from("push_subscriptions")
      .update({
        p256dh,
        auth,
        user_agent: userAgent,
        device_name: deviceName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", user.id)

    if (updateError) {
      console.error("[savePushSubscriptionAction] Update error:", updateError.message)
      return {
        ok: false,
        reason: "database_error",
        error: "Failed to update push subscription.",
      }
    }

    return {
      ok: true,
      action: "updated",
      id: existing.id,
    }
  }

  // 6. Insert new subscription under authenticated user's ID
  const { data: inserted, error: insertError } = await supabase
    .from("push_subscriptions")
    .insert({
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      device_name: deviceName,
    })
    .select("id")
    .single()

  if (insertError) {
    // Check if failure is due to unique constraint conflict (code 23505)
    // This happens if the endpoint already exists under another user account
    const isConflict =
      insertError.code === "23505" ||
      insertError.message?.toLowerCase().includes("unique") ||
      insertError.message?.toLowerCase().includes("duplicate key")

    if (isConflict) {
      return {
        ok: false,
        reason: "endpoint_conflict",
        error:
          "This push endpoint is already registered to another account and cannot be reassigned.",
      }
    }

    console.error("[savePushSubscriptionAction] Insert error:", insertError.message)
    return {
      ok: false,
      reason: "database_error",
      error: "Failed to save push subscription.",
    }
  }

  return {
    ok: true,
    action: "created",
    id: inserted?.id,
  }
}

/**
 * Server Action: Remove a Web Push subscription for the authenticated user.
 */
export async function deletePushSubscriptionAction(
  endpoint: string
): Promise<PushActionResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return {
      ok: false,
      reason: "unauthenticated",
      error: "Authentication required.",
    }
  }

  if (!endpoint || typeof endpoint !== "string") {
    return {
      ok: false,
      reason: "invalid_payload",
      error: "Valid push endpoint required.",
    }
  }

  const { error: deleteError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint.trim())
    .eq("user_id", user.id)

  if (deleteError) {
    console.error("[deletePushSubscriptionAction] Delete error:", deleteError.message)
    return {
      ok: false,
      reason: "database_error",
      error: "Failed to remove push subscription.",
    }
  }

  return {
    ok: true,
    action: "deleted",
  }
}
