/**
 * Seijun Server-Side Web Push Sending Infrastructure
 *
 * Implements standard RFC 8291 payload encryption and RFC 8292 VAPID message signing
 * using the official web-push library.
 *
 * SECURITY INVARIANTS:
 * 1. Server-Only: Throws immediately if loaded or executed in browser runtime.
 * 2. Secrets Protection: VAPID private key and subscription secrets are never returned
 *    to callers, exposed across network boundaries, or printed in logs.
 * 3. Sanitized Telemetry: Only non-sensitive response metadata (status code, endpoint host)
 *    may be logged for diagnostics.
 */

import webpush from "web-push"
import { getServerVapidConfig } from "@/lib/config/vapid"
import type {
  PushNotificationPayload,
  SendPushResult,
} from "@/lib/push/types"

// Enforce server-only execution guard
if (typeof window !== "undefined") {
  throw new Error(
    "[SECURITY VIOLATION] web-push sending utility must only be executed in a server environment."
  )
}

export interface WebPushSubscriptionCredentials {
  endpoint: string
  p256dh: string
  auth: string
}

export interface SendPushOptions {
  TTL?: number
  urgency?: "very-low" | "low" | "normal" | "high"
  topic?: string
}

/**
 * Validates whether the provided string is a plausible, well-formed HTTPS Web Push endpoint URL.
 */
export function isValidPushEndpoint(endpointStr: string): boolean {
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
export function isValidBase64Key(keyStr: string, minLength: number): boolean {
  if (!keyStr || typeof keyStr !== "string" || keyStr.length < minLength || keyStr.length > 512) {
    return false
  }

  return /^[A-Za-z0-9+/=_-]+$/.test(keyStr)
}

/**
 * Validates subscription input credentials.
 */
export function validateSubscriptionCredentials(sub: unknown): {
  valid: boolean
  error?: string
  cleanSubscription?: WebPushSubscriptionCredentials
} {
  if (!sub || typeof sub !== "object") {
    return { valid: false, error: "Push subscription credentials are required." }
  }

  const s = sub as Record<string, unknown>
  const endpoint = typeof s.endpoint === "string" ? s.endpoint.trim() : ""
  const p256dh = typeof s.p256dh === "string" ? s.p256dh.trim() : ""
  const auth = typeof s.auth === "string" ? s.auth.trim() : ""

  if (!endpoint || !isValidPushEndpoint(endpoint)) {
    return { valid: false, error: "A valid HTTPS Web Push endpoint URL is required." }
  }

  if (!p256dh || !isValidBase64Key(p256dh, 20)) {
    return { valid: false, error: "A valid p256dh cryptographic public key is required." }
  }

  if (!auth || !isValidBase64Key(auth, 10)) {
    return { valid: false, error: "A valid auth authentication secret is required." }
  }

  return {
    valid: true,
    cleanSubscription: { endpoint, p256dh, auth },
  }
}

/**
 * Serializes and validates a notification payload according to the Seijun Web Push contract.
 * Emits a JSON string matching public/sw.js push event expectations.
 */
export function serializeNotificationPayload(payload: PushNotificationPayload): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("Notification payload must be an object.")
  }

  const title = payload.title?.trim()
  const body = payload.body?.trim()

  if (!title) {
    throw new Error("Notification title is required and cannot be empty.")
  }

  if (!body) {
    throw new Error("Notification body is required and cannot be empty.")
  }

  const targetUrl = payload.url?.trim() || "/dashboard"

  return JSON.stringify({
    title,
    body,
    url: targetUrl,
    icon: payload.icon?.trim() || "/icons/icon-192.png",
    badge: payload.badge?.trim() || "/icons/icon-192.png",
    tag: payload.tag?.trim() || "seijun-notification",
    sound: payload.sound?.trim() || "/sounds/notification.wav",
    data: {
      url: targetUrl,
      ...(payload.data || {}),
    },
  })
}

/**
 * Sends a Web Push notification to a persisted subscription.
 *
 * @param subscription - Subscription credentials (endpoint, p256dh, auth).
 * @param payload - The notification payload to encrypt and deliver.
 * @param options - Web Push options (TTL, urgency, topic).
 * @returns Structured SendPushResult with categorized success/failure status.
 */
export async function sendWebPushNotification(
  subscription: WebPushSubscriptionCredentials,
  payload: PushNotificationPayload,
  options?: SendPushOptions
): Promise<SendPushResult> {
  // 1. Validate subscription credentials
  const subValidation = validateSubscriptionCredentials(subscription)
  if (!subValidation.valid || !subValidation.cleanSubscription) {
    return {
      ok: false,
      reason: "invalid_subscription",
      error: subValidation.error || "Invalid subscription credentials.",
    }
  }
  const cleanSub = subValidation.cleanSubscription

  // 2. Validate and serialize payload
  let serializedPayload: string
  try {
    serializedPayload = serializeNotificationPayload(payload)
  } catch (payloadErr) {
    return {
      ok: false,
      reason: "invalid_payload",
      error: payloadErr instanceof Error ? payloadErr.message : "Invalid notification payload.",
      endpoint: cleanSub.endpoint,
    }
  }

  // 3. Retrieve server VAPID configuration
  let vapidConfig
  try {
    vapidConfig = getServerVapidConfig()
  } catch (vapidErr) {
    return {
      ok: false,
      reason: "missing_vapid_config",
      error:
        vapidErr instanceof Error
          ? vapidErr.message
          : "Server VAPID configuration is missing or incomplete.",
      endpoint: cleanSub.endpoint,
    }
  }

  // 4. Construct RFC 8291 / 8292 compliant Web Push request
  const pushSubscription = {
    endpoint: cleanSub.endpoint,
    keys: {
      p256dh: cleanSub.p256dh,
      auth: cleanSub.auth,
    },
  }

  const vapidDetails = {
    subject: vapidConfig.subject,
    publicKey: vapidConfig.publicKey,
    privateKey: vapidConfig.privateKey,
  }

  try {
    const response = await webpush.sendNotification(pushSubscription, serializedPayload, {
      vapidDetails,
      TTL: options?.TTL ?? 86400, // 24 hours standard delivery TTL
      urgency: options?.urgency ?? "normal",
      topic: options?.topic,
    })

    return {
      ok: true,
      statusCode: response.statusCode,
      endpoint: cleanSub.endpoint,
    }
  } catch (err: unknown) {
    // Handle WebPushError (HTTP responses from push gateway)
    if (err && typeof err === "object" && "statusCode" in err) {
      const pushError = err as webpush.WebPushError
      const statusCode = pushError.statusCode

      // Safe sanitized logging: only log status code and endpoint host, never auth or keys
      try {
        const host = new URL(cleanSub.endpoint).hostname
        console.warn(`[WebPush] Push service returned HTTP ${statusCode} for endpoint host: ${host}`)
      } catch {
        console.warn(`[WebPush] Push service returned HTTP ${statusCode}`)
      }

      // 404 Not Found or 410 Gone indicates the push subscription is expired or deregistered
      if (statusCode === 404 || statusCode === 410) {
        return {
          ok: false,
          reason: "expired_subscription",
          error: "Push subscription has expired or was unsubscribed by the user.",
          statusCode,
          endpoint: cleanSub.endpoint,
          isExpired: true,
        }
      }

      // 401 Unauthorized or 403 Forbidden indicates VAPID signature or auth secret mismatch
      if (statusCode === 401 || statusCode === 403) {
        return {
          ok: false,
          reason: "auth_signing_failed",
          error: "Web Push service rejected VAPID authentication or signature.",
          statusCode,
          endpoint: cleanSub.endpoint,
        }
      }

      // 429 Too Many Requests or 5xx Server Errors
      if (statusCode === 429 || statusCode >= 500) {
        return {
          ok: false,
          reason: "remote_rejection",
          error: `Push service temporarily rejected the message (HTTP ${statusCode}).`,
          statusCode,
          endpoint: cleanSub.endpoint,
        }
      }

      return {
        ok: false,
        reason: "remote_rejection",
        error: `Push service rejected notification with HTTP ${statusCode}.`,
        statusCode,
        endpoint: cleanSub.endpoint,
      }
    }

    // Network errors, DNS resolution failures, or crypto errors
    const errorMessage =
      err instanceof Error ? err.message : "Unexpected failure sending Web Push notification."

    return {
      ok: false,
      reason: "unexpected_error",
      error: errorMessage,
      endpoint: cleanSub.endpoint,
    }
  }
}
