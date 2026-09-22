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

/**
 * Payload sent to the server-side persistence action.
 * NOTE: user_id is deliberately omitted because identity must be derived
 * exclusively from the verified Supabase Auth session on the server.
 */
export interface PushSubscriptionPayload {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string | null
  deviceName?: string | null
}

export interface PushActionSuccess {
  ok: true
  action: "created" | "updated" | "deleted"
  id?: string
}

export interface PushActionFailure {
  ok: false
  reason:
    | "unauthenticated"
    | "invalid_payload"
    | "endpoint_conflict"
    | "database_error"
  error: string
}

export type PushActionResponse = PushActionSuccess | PushActionFailure

export interface PushPersistenceSuccess {
  ok: true
  status: "existing" | "created"
  subscription: PushSubscription
  persistence: PushActionSuccess
}

export interface PushPersistenceFailure {
  ok: false
  reason:
    | PushFailureReason
    | "unauthenticated"
    | "persistence_failed"
    | "endpoint_conflict"
  message: string
  error?: unknown
}

export type PushPersistenceResult =
  | PushPersistenceSuccess
  | PushPersistenceFailure
