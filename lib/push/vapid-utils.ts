/**
 * Seijun Push Cryptographic & Base64 Utilities
 *
 * Implements browser-safe Base64URL conversions required by the Push API
 * without relying on Node.js Buffer or external libraries.
 */

/**
 * Converts a URL-safe Base64 string (such as a VAPID public key)
 * into a Uint8Array suitable for PushSubscriptionOptions.applicationServerKey.
 *
 * Handles:
 * - Converting '-' to '+'
 * - Converting '_' to '/'
 * - Adding missing '=' padding characters
 * - Decoding via browser-native window.atob
 *
 * @throws Error if base64String is empty or malformed
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const cleanString = base64String.trim()
  if (!cleanString) {
    throw new Error("[VAPID] Base64 string must not be empty.")
  }

  // Calculate missing padding to reach a multiple of 4
  const paddingLength = (4 - (cleanString.length % 4)) % 4
  const padding = "=".repeat(paddingLength)

  // Normalize URL-safe characters to standard Base64
  const base64 = (cleanString + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  // Use global atob (available on window in browser, or global in modern JS runtimes)
  const atobFn = typeof window !== "undefined" ? window.atob : atob
  if (typeof atobFn !== "function") {
    throw new Error("[VAPID] atob function is not available in current environment.")
  }

  const rawData = atobFn(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Converts an ArrayBuffer (such as from PushSubscription.getKey())
 * into a URL-safe Base64 string without padding.
 */
export function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer || buffer.byteLength === 0) {
    return ""
  }

  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  const btoaFn = typeof window !== "undefined" ? window.btoa : btoa
  if (typeof btoaFn !== "function") {
    return ""
  }

  return btoaFn(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}
