/**
 * Seijun Web Push & VAPID Configuration
 *
 * Enforces strict environment separation between client-safe public keys
 * and server-only private keys.
 */

export interface VapidServerConfig {
  publicKey: string
  privateKey: string
  subject: string
}

/**
 * Returns the public VAPID key used by the browser to create a PushSubscription.
 * Safe to call from both Client Components and Server Components.
 */
export function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  if (!key) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[VAPID] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined. Web Push subscriptions will fail."
      )
    }
    return ""
  }
  return key
}

/**
 * Returns the VAPID contact subject (RFC 8292 mailto: or https: URI).
 */
export function getVapidSubject(): string {
  return (
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "mailto:support@seijun.app"
  )
}

/**
 * Retrieves the full VAPID configuration for server-side push message signing.
 *
 * SECURITY INVARIANT:
 * This function MUST NEVER be called in a client/browser runtime.
 * Throws an error immediately if executed in the browser.
 */
export function getServerVapidConfig(): VapidServerConfig {
  if (typeof window !== "undefined") {
    throw new Error(
      "[SECURITY VIOLATION] getServerVapidConfig() was called in client-side browser context. VAPID_PRIVATE_KEY must remain strictly server-side."
    )
  }

  const publicKey = getVapidPublicKey()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = getVapidSubject()

  if (!publicKey || !privateKey) {
    throw new Error(
      "Missing VAPID configuration. Ensure NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set in environment variables."
    )
  }

  return {
    publicKey,
    privateKey,
    subject,
  }
}
