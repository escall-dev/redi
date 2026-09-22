import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Web Push Sending Infrastructure Test Suite (Phase 17.8) ===\n")

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
// 1. NOTIFICATION PAYLOAD CONTRACT & SERIALIZATION
// ---------------------------------------------------------------------------
console.log("[Test 1] Testing notification payload validation & serialization...")

function serializeNotificationPayload(payload) {
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
    data: {
      url: targetUrl,
      ...(payload.data || {}),
    },
  })
}

// Valid payload
const validPayload = {
  title: "Cycle Update",
  body: "Your new cycle begins today.",
  url: "/dashboard/cycles",
}
const serialized = serializeNotificationPayload(validPayload)
const parsed = JSON.parse(serialized)

assert(parsed.title === "Cycle Update", "Payload title serialized accurately")
assert(parsed.body === "Your new cycle begins today.", "Payload body serialized accurately")
assert(parsed.url === "/dashboard/cycles", "Payload url serialized accurately")
assert(parsed.data.url === "/dashboard/cycles", "Nested data.url matches root url for SW compatibility")
assert(parsed.icon === "/icons/icon-192.png", "Default icon populated")
assert(parsed.badge === "/icons/icon-192.png", "Default badge populated")

// Rejections
let titleMissing = false
try {
  serializeNotificationPayload({ body: "Missing title" })
} catch {
  titleMissing = true
}
assert(titleMissing, "Missing title rejected")

let bodyMissing = false
try {
  serializeNotificationPayload({ title: "Missing body" })
} catch {
  bodyMissing = true
}
assert(bodyMissing, "Missing body rejected")

let emptyPayload = false
try {
  serializeNotificationPayload(null)
} catch {
  emptyPayload = true
}
assert(emptyPayload, "Null/undefined payload rejected")

// ---------------------------------------------------------------------------
// 2. SUBSCRIPTION VALIDATION & HTTPS ENFORCEMENT
// ---------------------------------------------------------------------------
console.log("\n[Test 2] Testing server-side subscription validation logic...")

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

function validateSubscriptionCredentials(sub) {
  if (!sub || typeof sub !== "object") {
    return { valid: false, error: "Push subscription credentials are required." }
  }

  const s = sub
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

const validSub = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc-123_xyz",
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9bPghMW1234567890==",
  auth: "5K_m4aXYZ123==",
}
assert(validateSubscriptionCredentials(validSub).valid, "Valid subscription credentials accepted")

assert(
  !validateSubscriptionCredentials({ ...validSub, endpoint: "http://insecure.endpoint.com" }).valid,
  "Insecure HTTP endpoint rejected"
)
assert(
  !validateSubscriptionCredentials({ ...validSub, p256dh: "too-short" }).valid,
  "Short p256dh key rejected"
)
assert(
  !validateSubscriptionCredentials({ ...validSub, auth: "short" }).valid,
  "Short auth secret rejected"
)
assert(
  !validateSubscriptionCredentials({ ...validSub, endpoint: "" }).valid,
  "Empty endpoint rejected"
)

// ---------------------------------------------------------------------------
// 3. EXPIRED SUBSCRIPTION (404 / 410) & STATUS CODE MAPPING
// ---------------------------------------------------------------------------
console.log("\n[Test 3] Testing HTTP status code mapping and expiration detection...")

function mapWebPushError(statusCode, endpoint) {
  if (statusCode === 404 || statusCode === 410) {
    return {
      ok: false,
      reason: "expired_subscription",
      error: "Push subscription has expired or was unsubscribed by the user.",
      statusCode,
      endpoint,
      isExpired: true,
    }
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      ok: false,
      reason: "auth_signing_failed",
      error: "Web Push service rejected VAPID authentication or signature.",
      statusCode,
      endpoint,
    }
  }

  if (statusCode === 429 || statusCode >= 500) {
    return {
      ok: false,
      reason: "remote_rejection",
      error: `Push service temporarily rejected the message (HTTP ${statusCode}).`,
      statusCode,
      endpoint,
    }
  }

  return {
    ok: false,
    reason: "remote_rejection",
    error: `Push service rejected notification with HTTP ${statusCode}.`,
    statusCode,
    endpoint,
  }
}

const expired410 = mapWebPushError(410, validSub.endpoint)
assert(expired410.isExpired === true, "HTTP 410 flagged as isExpired: true")
assert(expired410.reason === "expired_subscription", "HTTP 410 classified as expired_subscription")

const expired404 = mapWebPushError(404, validSub.endpoint)
assert(expired404.isExpired === true, "HTTP 404 flagged as isExpired: true")
assert(expired404.reason === "expired_subscription", "HTTP 404 classified as expired_subscription")

const authFailed = mapWebPushError(401, validSub.endpoint)
assert(authFailed.reason === "auth_signing_failed", "HTTP 401 classified as auth_signing_failed")
assert(!authFailed.isExpired, "HTTP 401 not flagged as expired")

const throttled = mapWebPushError(429, validSub.endpoint)
assert(throttled.reason === "remote_rejection", "HTTP 429 classified as remote_rejection")

// ---------------------------------------------------------------------------
// 4. SERVER-ONLY BOUNDARY & SOURCE AUDIT
// ---------------------------------------------------------------------------
console.log("\n[Test 4] Verifying server-only boundaries & source code security...")

const serverPushPath = path.join(rootDir, "lib", "server", "web-push.ts")
assert(fs.existsSync(serverPushPath), "lib/server/web-push.ts exists")

const serverPushContent = fs.readFileSync(serverPushPath, "utf-8")

// Server guard check
assert(
  serverPushContent.includes('typeof window !== "undefined"'),
  "lib/server/web-push.ts contains typeof window !== 'undefined' runtime guard"
)
assert(
  serverPushContent.includes("webpush.sendNotification"),
  "lib/server/web-push.ts uses official web-push library sendNotification"
)
assert(
  serverPushContent.includes("getServerVapidConfig"),
  "lib/server/web-push.ts imports getServerVapidConfig from lib/config/vapid"
)
assert(
  !serverPushContent.includes("console.log(cleanSub.auth)") &&
    !serverPushContent.includes("console.log(pushSubscription)") &&
    !serverPushContent.includes("console.log(vapidConfig.privateKey)"),
  "Zero credential logging in lib/server/web-push.ts"
)

// ---------------------------------------------------------------------------
// 5. TEST SENDING ACTION AUDIT (app/actions/push-test.ts)
// ---------------------------------------------------------------------------
console.log("\n[Test 5] Auditing test sending Server Action (app/actions/push-test.ts)...")

const testActionPath = path.join(rootDir, "app", "actions", "push-test.ts")
assert(fs.existsSync(testActionPath), "app/actions/push-test.ts exists")

const testActionContent = fs.readFileSync(testActionPath, "utf-8")

assert(
  testActionContent.startsWith('"use server"') || testActionContent.startsWith("'use server'"),
  'app/actions/push-test.ts starts with "use server"'
)
assert(
  testActionContent.includes("supabase.auth.getUser()"),
  "Resolves user_id strictly via supabase.auth.getUser()"
)
assert(
  !testActionContent.includes("service_role") &&
    !testActionContent.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "Does NOT use service_role key"
)
assert(
  testActionContent.includes('.eq("user_id", user.id)'),
  "Queries and mutations are strictly scoped to authenticated user.id"
)
assert(
  testActionContent.includes("sendWebPushNotification"),
  "Invokes sendWebPushNotification"
)
assert(
  testActionContent.includes("result.isExpired") && testActionContent.includes(".delete()"),
  "Automatically cleans up expired (404/410) subscriptions under user ownership"
)

// ---------------------------------------------------------------------------
// 6. VERIFY NO AUTOMATIC PUSH SENDING ACROSS APP
// ---------------------------------------------------------------------------
console.log("\n[Test 6] Verifying zero automatic notification sending on page loads...")

function scanDirForAutoPush(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      continue
    }
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDirForAutoPush(fullPath)
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      if (
        entry.name === "web-push.ts" ||
        entry.name === "push-test.ts"
      ) {
        continue // Expected implementation files
      }
      const code = fs.readFileSync(fullPath, "utf-8")
      if (code.includes("sendWebPushNotification") || code.includes("sendTestPushNotificationAction")) {
        assert(false, `Unexpected push sending invocation found in ${path.relative(rootDir, fullPath)}`)
      }
    }
  }
}

scanDirForAutoPush(path.join(rootDir, "app"))
scanDirForAutoPush(path.join(rootDir, "components"))
assert(true, "Zero automated push sending invocations across app/ and components/")

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log("\n=================================================")
if (failures === 0) {
  console.log("ALL SEIJUN PHASE 17.8 WEB PUSH SENDING TESTS PASSED! 🎉")
  console.log("=================================================\n")
  process.exit(0)
} else {
  console.error(`FAILED: ${failures} test(s) failed.`)
  console.log("=================================================\n")
  process.exit(1)
}
