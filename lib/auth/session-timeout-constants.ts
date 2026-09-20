/**
 * Centralized constants and helpers for Seijun Inactivity Session Timeout
 *
 * Requirements:
 * - Total inactivity threshold: 10 minutes (INACTIVITY_TIMEOUT_MS)
 * - Warning begins: 2 minutes before timeout / at 8 minutes (INACTIVITY_WARNING_MS)
 * - Activity recording throttled to at most once every second (ACTIVITY_THROTTLE_MS)
 */

/** Total inactivity timeout duration in milliseconds: 10 minutes */
export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000

/** Warning countdown duration before timeout: 2 minutes */
export const INACTIVITY_WARNING_MS = 2 * 60 * 1000

/** Throttle limit for recording user activity events: 1 second */
export const ACTIVITY_THROTTLE_MS = 1000

/**
 * Format remaining milliseconds as MM:SS (e.g. 2:00, 1:59 down to 0:00).
 * Floors seconds so 1.9s displays as 1:59 and 0s displays as 0:00.
 */
export function formatCountdown(remainingMs: number): string {
  const safeMs = Math.max(0, remainingMs)
  const totalSeconds = Math.floor(safeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
