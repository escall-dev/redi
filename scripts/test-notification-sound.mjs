import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Notification Sound Integration Test Suite ===\n")

let failures = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`)
    failures++
  } else {
    console.log(`  ✓ ${message}`)
  }
}

// ---------------------------------------------------------------------------
// 1. Audio Asset Verification
// ---------------------------------------------------------------------------
console.log("[Test 1] Verifying notification sound audio asset in public/...")
const soundPath = path.join(rootDir, "public", "sounds", "notification.wav")
const originalSoundPath = path.join(rootDir, "public", "sounds", "mixkit-positive-notification-951.wav")

assert(fs.existsSync(soundPath), "Canonical sound file public/sounds/notification.wav exists")
assert(fs.existsSync(originalSoundPath), "Original sound file public/sounds/mixkit-positive-notification-951.wav exists")

if (fs.existsSync(soundPath)) {
  const stats = fs.statSync(soundPath)
  assert(stats.size > 100000, `Sound file size is valid (${stats.size} bytes)`)

  const buffer = fs.readFileSync(soundPath)
  const riffHeader = buffer.toString("ascii", 0, 4)
  const waveFormat = buffer.toString("ascii", 8, 12)
  assert(riffHeader === "RIFF", "Audio file has valid RIFF header")
  assert(waveFormat === "WAVE", "Audio file is valid WAVE format")
}

// ---------------------------------------------------------------------------
// 2. Database Migration Verification
// ---------------------------------------------------------------------------
console.log("\n[Test 2] Verifying Supabase migration for sound_enabled preference...")
const migrationPath = path.join(rootDir, "supabase", "migrations", "20260924000006_add_notification_sound_preference.sql")
assert(fs.existsSync(migrationPath), "Migration file exists")

if (fs.existsSync(migrationPath)) {
  const migrationContent = fs.readFileSync(migrationPath, "utf-8")
  assert(migrationContent.includes("ALTER TABLE public.notification_preferences"), "Alters notification_preferences table")
  assert(migrationContent.includes("ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN NOT NULL DEFAULT TRUE"), "Adds sound_enabled column with default TRUE")
}

// ---------------------------------------------------------------------------
// 3. Centralized Types & Defaults
// ---------------------------------------------------------------------------
console.log("\n[Test 3] Verifying centralized notification types and preferences defaults...")
const typesPath = path.join(rootDir, "lib", "notifications", "types.ts")
const typesContent = fs.readFileSync(typesPath, "utf-8")

assert(typesContent.includes("sound_enabled: boolean"), "NotificationPreferences includes sound_enabled")
assert(typesContent.includes("sound_enabled: true"), "DEFAULT_NOTIFICATION_PREFERENCES includes sound_enabled: true")
assert(typesContent.includes("export interface NotificationSoundActionResponse"), "Exports NotificationSoundActionResponse")

// ---------------------------------------------------------------------------
// 4. Server-Side Preference Utilities
// ---------------------------------------------------------------------------
console.log("\n[Test 4] Verifying server notification preferences handling...")
const serverPrefsPath = path.join(rootDir, "lib", "server", "notification-preferences.ts")
const serverPrefsContent = fs.readFileSync(serverPrefsPath, "utf-8")

assert(serverPrefsContent.includes("sound_enabled:"), "mapRowToPreferences maps sound_enabled")
assert(serverPrefsContent.includes("sound_enabled"), "getNotificationPreferences selects sound_enabled")

const actionsPrefsPath = path.join(rootDir, "app", "actions", "notification-preferences.ts")
const actionsPrefsContent = fs.readFileSync(actionsPrefsPath, "utf-8")

assert(actionsPrefsContent.includes("export async function updateNotificationSoundAction"), "Exports updateNotificationSoundAction Server Action")
assert(actionsPrefsContent.includes("sound_enabled: soundEnabled"), "updateNotificationSoundAction updates sound_enabled")

// ---------------------------------------------------------------------------
// 5. Client Sound Utility
// ---------------------------------------------------------------------------
console.log("\n[Test 5] Verifying client sound player utility...")
const soundUtilPath = path.join(rootDir, "lib", "notifications", "sound.ts")
assert(fs.existsSync(soundUtilPath), "lib/notifications/sound.ts exists")

if (fs.existsSync(soundUtilPath)) {
  const soundUtilContent = fs.readFileSync(soundUtilPath, "utf-8")
  assert(soundUtilContent.includes('use client'), "Sound utility is marked 'use client'")
  assert(soundUtilContent.includes("/sounds/notification.wav"), "Defines /sounds/notification.wav canonical URL")
  assert(soundUtilContent.includes("export function isSoundEnabledLocally"), "Exports isSoundEnabledLocally")
  assert(soundUtilContent.includes("export function setSoundEnabledLocally"), "Exports setSoundEnabledLocally")
  assert(soundUtilContent.includes("export async function playNotificationSound"), "Exports playNotificationSound")
  assert(soundUtilContent.includes("NotAllowedError"), "Gracefully catches browser autoplay policy restrictions")
}

// ---------------------------------------------------------------------------
// 6. Service Worker Push Sound
// ---------------------------------------------------------------------------
console.log("\n[Test 6] Verifying Service Worker push sound integration...")
const swPath = path.join(rootDir, "public", "sw.js")
const swContent = fs.readFileSync(swPath, "utf-8")

assert(swContent.includes('sound: data.sound || "/sounds/notification.wav"'), "sw.js specifies sound in showNotification options")
assert(swContent.includes("sound: options.sound"), "sw.js relays sound attribute to window clients via postMessage")

// ---------------------------------------------------------------------------
// 7. Push Payloads Contract
// ---------------------------------------------------------------------------
console.log("\n[Test 7] Verifying Web Push payloads serialization & delivery calls...")
const webPushPath = path.join(rootDir, "lib", "server", "web-push.ts")
const webPushContent = fs.readFileSync(webPushPath, "utf-8")
assert(webPushContent.includes('sound: payload.sound?.trim() || "/sounds/notification.wav"'), "web-push.ts serializes sound attribute")

const partnerNotifPath = path.join(rootDir, "lib", "partner", "notification.ts")
const partnerNotifContent = fs.readFileSync(partnerNotifPath, "utf-8")
assert(partnerNotifContent.includes('sound: "/sounds/notification.wav"'), "Partner invitation push payload includes sound")

const processorPath = path.join(rootDir, "lib", "reminders", "processor.ts")
const processorContent = fs.readFileSync(processorPath, "utf-8")
assert(processorContent.includes('sound: "/sounds/notification.wav"'), "Cycle reminder processor push payload includes sound")

const pushTestPath = path.join(rootDir, "app", "actions", "push-test.ts")
const pushTestContent = fs.readFileSync(pushTestPath, "utf-8")
assert(pushTestContent.includes('sound: "/sounds/notification.wav"'), "Push test action payload includes sound")

// ---------------------------------------------------------------------------
// 8. In-App Realtime Notification Sound Playback
// ---------------------------------------------------------------------------
console.log("\n[Test 8] Verifying RealtimeNotificationProvider sound playback...")
const providerPath = path.join(rootDir, "components", "notifications", "realtime-notification-provider.tsx")
const providerContent = fs.readFileSync(providerPath, "utf-8")

assert(providerContent.includes('import { playNotificationSound } from "@/lib/notifications/sound"'), "RealtimeNotificationProvider imports playNotificationSound")
assert(providerContent.includes("playNotificationSound()"), "Calls playNotificationSound on notification event")
assert(providerContent.includes("SEIJUN_PUSH_RECEIVED"), "Listens for SEIJUN_PUSH_RECEIVED push events")
assert(providerContent.includes("seijun:play-notification-sound"), "Listens for manual sound play event")

// ---------------------------------------------------------------------------
// 9. Settings UI Preferences Controls
// ---------------------------------------------------------------------------
console.log("\n[Test 9] Verifying Notification Preferences Settings UI...")
const settingsCardPath = path.join(rootDir, "components", "settings", "notification-preferences.tsx")
const settingsCardContent = fs.readFileSync(settingsCardPath, "utf-8")

assert(settingsCardContent.includes("Notification Sound"), "Renders Notification Sound heading")
assert(settingsCardContent.includes("handleSoundToggle"), "Implements sound toggle handler")
assert(settingsCardContent.includes("handlePreviewSound"), "Implements sound preview handler")
assert(settingsCardContent.includes("updateNotificationSoundAction"), "Calls updateNotificationSoundAction")
assert(settingsCardContent.includes("playNotificationSound"), "Calls playNotificationSound for preview")
assert(settingsCardContent.includes("role=\"switch\""), "Provides accessible switch role for sound toggle")

console.log("\n=================================================")
if (failures === 0) {
  console.log("ALL SEIJUN NOTIFICATION SOUND TESTS PASSED! 🎉")
  console.log("=================================================\n")
  process.exit(0)
} else {
  console.error(`FAILED: ${failures} test(s) failed.`)
  console.log("=================================================\n")
  process.exit(1)
}
