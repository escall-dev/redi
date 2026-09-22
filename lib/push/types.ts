/**
 * Seijun Web Push Subscription Types
 *
 * Defines type contracts for browser push support detection, permission state,
 * serializable subscription payloads, and structured execution results.
 */

export interface PushSupportStatus {
  /**
   * True if all prerequisite browser APIs are available:
   * window, navigator.serviceWorker, window.PushManager, and window.Notification.
   */
  isSupported: boolean
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
}

export type PushPermissionState = NotificationPermission | "unsupported"

export type PushFailureReason =
  | "unsupported"
  | "permission_denied"
  | "permission_dismissed"
  | "missing_vapid_key"
  | "service_worker_unavailable"
  | "subscription_failed"

export interface SerializablePushSubscription {
  endpoint: string
  p256dh: string
  auth: string
  expirationTime?: number | null
}

export interface PushSubscriptionSuccess {
  ok: true
  status: "existing" | "created"
  subscription: PushSubscription
  serialized: SerializablePushSubscription
}

export interface PushSubscriptionFailure {
  ok: false
  reason: PushFailureReason
  message: string
  error?: unknown
}

export type PushSubscriptionResult =
  | PushSubscriptionSuccess
  | PushSubscriptionFailure

export interface SubscribeWebPushOptions {
  /**
   * Optional VAPID public key override. If omitted, falls back to
   * NEXT_PUBLIC_VAPID_PUBLIC_KEY from environment.
   */
  vapidPublicKey?: string
}
