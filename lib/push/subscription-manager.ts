/**
 * Seijun Web Push Subscription Manager
 *
 * Implements client-side Web Push subscription handling using standard browser APIs:
 * navigator.serviceWorker, ServiceWorkerRegistration, Notification, and PushManager.
 *
 * Architectural Principles:
 * - Strictly client-side safe: Guarded against Next.js SSR execution.
 * - Explicit user-triggered permission model: Never triggers permission prompts on load.
 * - Reuses existing Service Worker registration (root /sw.js) via navigator.serviceWorker.ready.
 * - Checks and reuses existing subscriptions before attempting new registration.
 * - Strictly uses NEXT_PUBLIC_VAPID_PUBLIC_KEY; never references server private keys.
 * - Phase 17.6 boundary: Prepares and returns the subscription; does NOT persist to Supabase.
 */

import { getVapidPublicKey } from "@/lib/config/vapid"
import {
  PushPermissionState,
  PushPersistenceResult,
  PushSubscriptionResult,
  PushSupportStatus,
  SerializablePushSubscription,
  SubscribeWebPushOptions,
} from "./types"
import { arrayBufferToBase64Url, urlBase64ToUint8Array } from "./vapid-utils"
import {
  savePushSubscriptionAction,
  deletePushSubscriptionAction,
} from "@/app/actions/push"

/**
 * Returns a boolean indicating whether the current browser supports Web Push.
 * Safe to call during Next.js SSR (returns false on server).
 */
export function isWebPushSupported(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

/**
 * Returns detailed breakdown of Web Push prerequisites in the current environment.
 */
export function getWebPushSupportDetails(): PushSupportStatus {
  if (typeof window === "undefined") {
    return {
      isSupported: false,
      hasServiceWorker: false,
      hasPushManager: false,
      hasNotification: false,
    }
  }

  const hasServiceWorker = "serviceWorker" in navigator
  const hasPushManager = "PushManager" in window
  const hasNotification = "Notification" in window

  return {
    isSupported: hasServiceWorker && hasPushManager && hasNotification,
    hasServiceWorker,
    hasPushManager,
    hasNotification,
  }
}

/**
 * Returns the current Notification permission state.
 * Returns "unsupported" if running on server or in an unsupported browser.
 */
export function getNotificationPermission(): PushPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported"
  }

  return Notification.permission
}

/**
 * Serializes a PushSubscription object into standard fields required for storage
 * and server-side push payload encryption (RFC 8291).
 */
export function serializePushSubscription(
  subscription: PushSubscription
): SerializablePushSubscription {
  const json = subscription.toJSON()
  const endpoint = subscription.endpoint || json.endpoint || ""

  // Use toJSON() keys if available, otherwise fall back to getKey()
  let p256dh = json.keys?.p256dh || ""
  if (!p256dh && typeof subscription.getKey === "function") {
    p256dh = arrayBufferToBase64Url(subscription.getKey("p256dh"))
  }

  let auth = json.keys?.auth || ""
  if (!auth && typeof subscription.getKey === "function") {
    auth = arrayBufferToBase64Url(subscription.getKey("auth"))
  }

  return {
    endpoint,
    p256dh,
    auth,
    expirationTime: subscription.expirationTime ?? json.expirationTime ?? null,
  }
}

/**
 * Retrieves the currently active browser PushSubscription if one exists.
 * Does not prompt for permissions or create a new subscription.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    if (!registration || !registration.pushManager) {
      return null
    }

    return await registration.pushManager.getSubscription()
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PushManager] Error checking existing subscription:", err)
    }
    return null
  }
}

/**
 * Subscribes the client browser to Web Push notifications.
 *
 * CRITICAL PERMISSION BEHAVIOR:
 * This method MUST ONLY be called as a result of an explicit user action (e.g. clicking
 * an 'Enable Notifications' button). It will never be triggered automatically on page load.
 *
 * Execution Flow:
 * 1. Validate browser support (ServiceWorker, PushManager, Notification).
 * 2. Check current notification permission:
 *    - If 'denied': returns immediate failure indicating notifications are blocked.
 *    - If 'default': explicitly prompts user via Notification.requestPermission().
 *    - If denied/dismissed: returns appropriate failure result.
 * 3. Await active Service Worker registration (navigator.serviceWorker.ready).
 * 4. Check for existing subscription:
 *    - If active subscription exists: reuses and returns it immediately (prevents duplicate registrations).
 * 5. Retrieve public VAPID key and convert from URL-safe Base64 into Uint8Array.
 * 6. Create new subscription via registration.pushManager.subscribe({ userVisibleOnly: true, ... }).
 * 7. Return PushSubscription and serializable data to the application.
 */
export async function subscribeToWebPush(
  options?: SubscribeWebPushOptions
): Promise<PushSubscriptionResult> {
  // 1. Support check
  if (!isWebPushSupported()) {
    return {
      ok: false,
      reason: "unsupported",
      message: "Web Push notifications are not supported by this browser.",
    }
  }

  // 2. Permission handling
  let currentPermission: NotificationPermission = Notification.permission

  if (currentPermission === "denied") {
    return {
      ok: false,
      reason: "permission_denied",
      message:
        "Notification permission is blocked. Please enable notifications in your browser site settings.",
    }
  }

  if (currentPermission === "default") {
    try {
      currentPermission = await Notification.requestPermission()
    } catch (permError) {
      return {
        ok: false,
        reason: "permission_denied",
        message: "Failed to request notification permission.",
        error: permError,
      }
    }

    if (currentPermission === "denied") {
      return {
        ok: false,
        reason: "permission_denied",
        message: "Notification permission was denied by the user.",
      }
    }

    if (currentPermission === "default") {
      return {
        ok: false,
        reason: "permission_dismissed",
        message: "Notification permission prompt was dismissed without decision.",
      }
    }
  }

  // At this point, permission is guaranteed to be 'granted'
  if (currentPermission !== "granted") {
    return {
      ok: false,
      reason: "permission_denied",
      message: "Notification permission is not granted.",
    }
  }

  // 3. Service Worker registration check
  let registration: ServiceWorkerRegistration
  try {
    registration = await navigator.serviceWorker.ready
  } catch (swError) {
    return {
      ok: false,
      reason: "service_worker_unavailable",
      message: "Active service worker registration could not be obtained.",
      error: swError,
    }
  }

  if (!registration || !registration.pushManager) {
    return {
      ok: false,
      reason: "service_worker_unavailable",
      message: "PushManager is not available on the service worker registration.",
    }
  }

  // 4. Check for existing subscription (Avoid duplicate subscriptions)
  try {
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      return {
        ok: true,
        status: "existing",
        subscription: existingSubscription,
        serialized: serializePushSubscription(existingSubscription),
      }
    }
  } catch (existingError) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[PushManager] Failed to inspect existing subscription; proceeding to subscribe:",
        existingError
      )
    }
  }

  // 5. VAPID public key retrieval and conversion
  const rawKey = options?.vapidPublicKey || getVapidPublicKey()
  if (!rawKey) {
    return {
      ok: false,
      reason: "missing_vapid_key",
      message:
        "VAPID public key is missing. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in environment variables.",
    }
  }

  let applicationServerKey: Uint8Array<ArrayBuffer>
  try {
    applicationServerKey = urlBase64ToUint8Array(rawKey)
  } catch (keyError) {
    return {
      ok: false,
      reason: "subscription_failed",
      message: "Failed to parse VAPID public key into applicationServerKey.",
      error: keyError,
    }
  }

  // 6. Create new PushSubscription
  try {
    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })

    return {
      ok: true,
      status: "created",
      subscription: newSubscription,
      serialized: serializePushSubscription(newSubscription),
    }
  } catch (subError) {
    return {
      ok: false,
      reason: "subscription_failed",
      message:
        subError instanceof Error
          ? subError.message
          : "An unexpected error occurred while creating the push subscription.",
      error: subError,
    }
  }
}

/**
 * Unsubscribes the current browser device from Web Push notifications.
 * Returns true if an existing subscription was unsubscribed or if no subscription existed.
 */
export async function unsubscribeFromWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration?.pushManager?.getSubscription()

    if (!subscription) {
      return true
    }

    return await subscription.unsubscribe()
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PushManager] Error unsubscribing from Web Push:", err)
    }
    return false
  }
}

/**
 * High-level orchestration for user-initiated push notification enrollment.
 *
 * CRITICAL PERMISSION & INITIATION MODEL:
 * This method MUST ONLY be called in response to an explicit user interaction (e.g. clicking
 * an 'Enable Push Notifications' button).
 *
 * Flow:
 * 1. Checks browser support and handles user permission prompt (if state is 'default').
 * 2. Obtains or creates standard browser PushSubscription via VAPID key.
 * 3. Serializes subscription payload.
 * 4. Calls Server Action to verify authentication and persist subscription under auth.uid().
 * 5. Returns typed result indicating success (created/existing) or structured error.
 */
export async function registerAndPersistWebPush(
  options?: SubscribeWebPushOptions & { deviceName?: string }
): Promise<PushPersistenceResult> {
  // 1. Obtain browser PushSubscription (handles support and permissions)
  const subResult = await subscribeToWebPush(options)

  if (!subResult.ok) {
    return {
      ok: false,
      reason: subResult.reason,
      message: subResult.message,
      error: subResult.error,
    }
  }

  // 2. Persist to Supabase via authenticated Server Action
  const persistResponse = await savePushSubscriptionAction({
    endpoint: subResult.serialized.endpoint,
    p256dh: subResult.serialized.p256dh,
    auth: subResult.serialized.auth,
    deviceName: options?.deviceName,
  })

  if (!persistResponse.ok) {
    return {
      ok: false,
      reason:
        persistResponse.reason === "unauthenticated"
          ? "unauthenticated"
          : persistResponse.reason === "endpoint_conflict"
            ? "endpoint_conflict"
            : "persistence_failed",
      message: persistResponse.error,
    }
  }

  return {
    ok: true,
    status: subResult.status,
    subscription: subResult.subscription,
    persistence: persistResponse,
  }
}

/**
 * High-level orchestration to unsubscribe both the browser device and remove
 * the record from Supabase.
 */
export async function unsubscribeAndRemoveWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration?.pushManager?.getSubscription()

    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()

      if (endpoint) {
        await deletePushSubscriptionAction(endpoint)
      }
    }

    return true
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PushManager] Error in unsubscribeAndRemoveWebPush:", err)
    }
    return false
  }
}
