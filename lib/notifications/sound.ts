"use client"

/**
 * Seijun Notification Audio & Sound Management System
 *
 * Provides a resilient client-side audio trigger for push notifications,
 * partner invitations, cycle reminders, and in-app toasts.
 *
 * Invariants:
 * - Plays the canonical notification chime: /sounds/notification.wav
 * - Respects user preferences (stored in localStorage and synced with database)
 * - Safe against browser autoplay policy restrictions (swallows NotAllowedError)
 * - Zero SSR errors: guards against window / Audio absence
 */

export const NOTIFICATION_SOUND_URL = "/sounds/notification.wav"
export const NOTIFICATION_SOUND_STORAGE_KEY = "seijun_notification_sound_enabled"

let sharedAudio: HTMLAudioElement | null = null

/**
 * Checks whether notification sound is enabled in local storage.
 * Defaults to true.
 */
export function isSoundEnabledLocally(): boolean {
  if (typeof window === "undefined") return true
  try {
    const val = localStorage.getItem(NOTIFICATION_SOUND_STORAGE_KEY)
    if (val === null) return true
    return val === "true"
  } catch {
    return true
  }
}

/**
 * Sets notification sound preference in local storage.
 */
export function setSoundEnabledLocally(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(NOTIFICATION_SOUND_STORAGE_KEY, String(enabled))
  } catch {
    // Ignore localStorage write errors (e.g. private browsing storage quota)
  }
}

/**
 * Plays the notification sound.
 *
 * @param soundUrl - Optional custom sound URL (defaults to /sounds/notification.wav)
 * @param forcePlay - If true, ignores local soundEnabled flag (useful for settings preview/test button)
 * @returns Promise<boolean> - true if playback started successfully, false otherwise
 */
export async function playNotificationSound(
  soundUrl: string = NOTIFICATION_SOUND_URL,
  forcePlay: boolean = false
): Promise<boolean> {
  if (typeof window === "undefined") return false

  // Check user preference unless explicitly forced (e.g. preview)
  if (!forcePlay && !isSoundEnabledLocally()) {
    return false
  }

  try {
    if (!sharedAudio) {
      sharedAudio = new Audio(soundUrl)
    } else if (sharedAudio.src !== new URL(soundUrl, window.location.origin).href) {
      sharedAudio.src = soundUrl
    }

    // Reset playback to beginning
    sharedAudio.currentTime = 0
    await sharedAudio.play()
    return true
  } catch (err: unknown) {
    // Autoplay restrictions or audio device unavailable
    const isAutoplayBlock =
      err instanceof Error &&
      (err.name === "NotAllowedError" || err.message.includes("interact"))

    if (isAutoplayBlock) {
      console.debug(
        "[playNotificationSound] Audio playback deferred: user has not interacted with document yet."
      )
    } else {
      console.debug("[playNotificationSound] Audio play failed:", err)
    }
    return false
  }
}
