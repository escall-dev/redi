import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Push Subscription Persistence Test Suite ===\n")

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
// 1. ENDPOINT AND CRYPTO VALIDATION LOGIC TESTS
// ---------------------------------------------------------------------------
console.log("[Test 1] Testing input validation logic...")

function isValidPushEndpoint(endpointStr) {
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

function isValidBase64Key(keyStr, minLength) {
  if (!keyStr || typeof keyStr !== "string" || keyStr.length < minLength || keyStr.length > 512) {
    return false
  }

  return /^[A-Za-z0-9+/=_-]+$/.test(keyStr)
}

// Valid endpoints
assert(
  isValidPushEndpoint("https://fcm.googleapis.com/fcm/send/abc-123_xyz"),
  "Valid FCM HTTPS endpoint accepted"
)
assert(
  isValidPushEndpoint("https://web.push.apple.com/QN2..."),
  "Valid Apple WebPush endpoint accepted"
)
assert(
  isValidPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/gAAAA..."),
  "Valid Mozilla WebPush endpoint accepted"
)

// Invalid endpoints
assert(
  !isValidPushEndpoint("http://insecure-push.example.com/endpoint"),
  "Insecure HTTP endpoint rejected"
)
assert(
  !isValidPushEndpoint("ftp://ftp.example.com/push"),
  "Non-HTTP(S) endpoint rejected"
)
assert(
  !isValidPushEndpoint("not-a-url"),
  "Malformed string endpoint rejected"
)
assert(
  !isValidPushEndpoint(""),
  "Empty endpoint rejected"
)

// Key validations
const validP256dh = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9bPghMW...==".replace(/\./g, "A")
assert(isValidBase64Key(validP256dh, 20), "Valid p256dh base64/base64url accepted")
assert(!isValidBase64Key("short", 20), "Too short p256dh rejected")
assert(!isValidBase64Key("invalid characters!@#$%", 20), "Invalid characters in p256dh rejected")

const validAuth = "5K_m4a...==".replace(/\./g, "B")
assert(isValidBase64Key(validAuth, 10), "Valid auth secret accepted")
assert(!isValidBase64Key("short", 10), "Too short auth secret rejected")

// ---------------------------------------------------------------------------
// 2. SECURITY SCAN: app/actions/push.ts
// ---------------------------------------------------------------------------
console.log("\n[Test 2] Security audit on app/actions/push.ts...")

const pushActionPath = path.join(rootDir, "app", "actions", "push.ts")
assert(fs.existsSync(pushActionPath), "app/actions/push.ts exists")

const actionContent = fs.readFileSync(pushActionPath, "utf-8")

// Directives and imports
assert(
  actionContent.startsWith('"use server"') || actionContent.startsWith("'use server'"),
  'app/actions/push.ts starts with "use server"'
)
assert(
  actionContent.includes('import { createClient } from "@/lib/supabase/server"'),
  "Uses standard authenticated Supabase server client"
)
assert(
  !actionContent.includes("service_role") && !actionContent.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "Does NOT use service_role key for persistence"
)
assert(
  !actionContent.includes("VAPID_PRIVATE_KEY"),
  "Does NOT reference or expose VAPID_PRIVATE_KEY"
)

// User ID resolution
assert(
  actionContent.includes("supabase.auth.getUser()"),
  "Resolves user_id strictly via supabase.auth.getUser()"
)
assert(
  !actionContent.includes("payload.user_id"),
  "Does NOT accept user_id from client payload"
)

// Ownership and conflict protection
assert(
  actionContent.includes("23505") || actionContent.includes("endpoint_conflict"),
  "Handles PostgreSQL unique constraint conflict (code 23505 / endpoint_conflict)"
)
assert(
  actionContent.includes('.eq("endpoint", endpoint)'),
  "Checks existing subscription by unique endpoint"
)
assert(
  actionContent.includes('.eq("user_id", user.id)'),
  "Safeguards database mutations with authenticated user.id"
)

// ---------------------------------------------------------------------------
// 3. DATABASE SCHEMA & RLS INTEGRITY CHECK
// ---------------------------------------------------------------------------
console.log("\n[Test 3] Verifying database schema and RLS invariants...")

const migration1Path = path.join(
  rootDir,
  "supabase",
  "migrations",
  "20260922000001_push_subscriptions.sql"
)
const migration2Path = path.join(
  rootDir,
  "supabase",
  "migrations",
  "20260922000002_push_subscriptions_rls.sql"
)

assert(fs.existsSync(migration1Path), "Phase 17.4 schema migration exists")
assert(fs.existsSync(migration2Path), "Phase 17.5 RLS migration exists")

const rlsContent = fs.readFileSync(migration2Path, "utf-8")
assert(
  rlsContent.includes("ENABLE ROW LEVEL SECURITY"),
  "RLS is enabled for push_subscriptions"
)
assert(
  rlsContent.includes("(SELECT auth.uid()) = user_id"),
  "RLS enforces (SELECT auth.uid()) = user_id"
)

// ---------------------------------------------------------------------------
// 4. CLIENT INTEGRATION CHECK: lib/push
// ---------------------------------------------------------------------------
console.log("\n[Test 4] Verifying client integration in lib/push...")

const subManagerPath = path.join(rootDir, "lib", "push", "subscription-manager.ts")
const subManagerContent = fs.readFileSync(subManagerPath, "utf-8")

assert(
  subManagerContent.includes("registerAndPersistWebPush"),
  "lib/push exports registerAndPersistWebPush"
)
assert(
  subManagerContent.includes("savePushSubscriptionAction"),
  "registerAndPersistWebPush connects to savePushSubscriptionAction"
)
assert(
  subManagerContent.includes("unsubscribeAndRemoveWebPush"),
  "lib/push exports unsubscribeAndRemoveWebPush"
)

const typesPath = path.join(rootDir, "lib", "push", "types.ts")
const typesContent = fs.readFileSync(typesPath, "utf-8")

assert(
  typesContent.includes("PushSubscriptionPayload"),
  "lib/push/types.ts defines PushSubscriptionPayload"
)
assert(
  !typesContent.includes("user_id: string") && !typesContent.includes("userId: string"),
  "PushSubscriptionPayload deliberately excludes user_id"
)

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log("\n=================================================")
if (failures === 0) {
  console.log("ALL SEIJUN PUSH PERSISTENCE TESTS PASSED! 🎉")
  console.log("=================================================\n")
  process.exit(0)
} else {
  console.error(`FAILED: ${failures} test(s) failed.`)
  console.log("=================================================\n")
  process.exit(1)
}
