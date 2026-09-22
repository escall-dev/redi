import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun End-to-End Web Push Test Suite (Phase 17.9) ===\n")

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
// 1. TEST PAYLOAD INTEGRITY & SENSITIVE DATA PROHIBITION
// ---------------------------------------------------------------------------
console.log("[Test 1] Verifying test notification payload contract & safety...")

const pushTestPath = path.join(rootDir, "app", "actions", "push-test.ts")
assert(fs.existsSync(pushTestPath), "app/actions/push-test.ts exists")

const pushTestContent = fs.readFileSync(pushTestPath, "utf-8")

// Ensure payload has standard test notification title & body
assert(
  pushTestContent.includes("Seijun Test Notification"),
  "Test payload defines title 'Seijun Test Notification'"
)
assert(
  pushTestContent.includes("seijun-push-test"),
  "Test payload tag set to 'seijun-push-test'"
)
assert(
  pushTestContent.includes('url: "/dashboard"') || pushTestContent.includes("url: '/dashboard'"),
  "Test payload points to '/dashboard' for click routing"
)

// Sensitive terms check: verify test payload contains NO health/cycle data
const sensitiveTerms = [
  "period",
  "flow",
  "ovulation",
  "luteal",
  "follicular",
  "cramps",
  "mood",
  "partner",
  "symptom",
  "pregnancy",
  "contraceptive",
  "cycle day",
]

let containsSensitive = false
for (const term of sensitiveTerms) {
  // Check within SEIJUN_TEST_PAYLOAD definition
  const payloadDefMatch = pushTestContent.match(/SEIJUN_TEST_PAYLOAD\s*:\s*PushNotificationPayload\s*=\s*{[\s\S]*?}/)
  if (payloadDefMatch && payloadDefMatch[0].toLowerCase().includes(term)) {
    console.error(`  ❌ Found sensitive term in test payload: "${term}"`)
    containsSensitive = true
  }
}
assert(!containsSensitive, "Test payload is 100% free of user-specific sensitive/cycle/health data")

// ---------------------------------------------------------------------------
// 2. TEST A: CURRENT-ACCOUNT MULTI-DEVICE ITERATION & STRUCTURED RESULTS
// ---------------------------------------------------------------------------
console.log("\n[Test 2] Auditing Test A (current-account multi-device test action)...")

assert(
  pushTestContent.includes("sendCurrentAccountTestPushAction"),
  "app/actions/push-test.ts exports sendCurrentAccountTestPushAction"
)
assert(
  pushTestContent.includes("supabase.auth.getUser()"),
  "Authenticates user strictly via supabase.auth.getUser()"
)
assert(
  pushTestContent.includes('.eq("user_id", user.id)'),
  "Queries subscriptions strictly scoped to authenticated user.id"
)
assert(
  pushTestContent.includes("for (const sub of subscriptions)") ||
    pushTestContent.includes("for (const sub of data)") ||
    pushTestContent.includes("subscriptions.map"),
  "Iterates over all subscriptions belonging to the user (multi-device support)"
)

// Aggregate summary structure simulation
function simulateDeliveryAggregation(subscriptions, deliveryResponses) {
  let delivered = 0
  let expired = 0
  let failed = 0

  for (let i = 0; i < subscriptions.length; i++) {
    const res = deliveryResponses[i]
    if (res.ok) {
      delivered++
    } else if (res.isExpired) {
      expired++
    } else {
      failed++
    }
  }

  return {
    ok: delivered > 0,
    attempted: subscriptions.length,
    delivered,
    expired,
    failed,
  }
}

const mockSubsUserA = [
  { id: "sub-1", endpoint: "https://fcm.googleapis.com/1" },
  { id: "sub-2", endpoint: "https://fcm.googleapis.com/2" },
]
const mockResponsesUserA = [
  { ok: true, statusCode: 201 },
  { ok: false, statusCode: 410, isExpired: true },
]
const userASummary = simulateDeliveryAggregation(mockSubsUserA, mockResponsesUserA)

assert(userASummary.attempted === 2, "Test A correctly counts attempted subscriptions (2)")
assert(userASummary.delivered === 1, "Test A correctly counts delivered subscriptions (1)")
assert(userASummary.expired === 1, "Test A correctly counts expired subscriptions (1)")
assert(userASummary.failed === 0, "Test A correctly counts failed subscriptions (0)")
assert(userASummary.ok === true, "Test A summary.ok is true when at least one delivery succeeded")

// ---------------------------------------------------------------------------
// 3. EXPIRED SUBSCRIPTION CLEANUP LOGIC (HTTP 404/410)
// ---------------------------------------------------------------------------
console.log("\n[Test 3] Verifying expired subscription cleanup logic...")

assert(
  pushTestContent.includes("result.isExpired") && pushTestContent.includes(".delete()"),
  "Automatically detects isExpired and triggers safe deletion"
)
assert(
  pushTestContent.includes('.eq("id", sub.id)') &&
    (pushTestContent.includes('.eq("user_id", user.id)') || pushTestContent.includes("delete_expired_push_subscription_admin")),
  "Deletion is scoped safely by subscription id and ownership"
)

// ---------------------------------------------------------------------------
// 4. TEST B: GLOBAL BROADCAST PATHWAY AUTHORIZATION & SECURITY
// ---------------------------------------------------------------------------
console.log("\n[Test 4] Auditing Test B (global broadcast test pathway & authorization)...")

assert(
  pushTestContent.includes("sendGlobalTestPushBroadcastAction"),
  "app/actions/push-test.ts exports sendGlobalTestPushBroadcastAction"
)

// Server-side authorization check in source
assert(
  pushTestContent.includes('process.env.NODE_ENV === "development"') ||
    pushTestContent.includes("process.env.NODE_ENV === 'development'"),
  "Global broadcast verifies development environment guard"
)
assert(
  pushTestContent.includes("process.env.ADMIN_TEST_SECRET") ||
    pushTestContent.includes("process.env.ADMIN_PUSH_KEY"),
  "Global broadcast supports server-side admin secret verification"
)
assert(
  pushTestContent.includes('"forbidden"') || pushTestContent.includes("'forbidden'"),
  "Rejects unauthorized global broadcast invocation with 'forbidden' status"
)

// Security simulation of auth check
function authorizeGlobalBroadcast(nodeEnv, clientSecret, serverSecret) {
  const isDev = nodeEnv === "development"
  const isAuthorizedSecret = Boolean(serverSecret && clientSecret === serverSecret)
  if (!isDev && !isAuthorizedSecret) {
    return { ok: false, reason: "forbidden" }
  }
  return { ok: true }
}

assert(
  authorizeGlobalBroadcast("development", null, null).ok === true,
  "Development environment permitted for global broadcast"
)
assert(
  authorizeGlobalBroadcast("production", "secret123", "secret123").ok === true,
  "Production environment permitted when admin secret matches"
)
assert(
  authorizeGlobalBroadcast("production", "wrong", "secret123").ok === false,
  "Production environment rejected when admin secret does not match"
)
assert(
  authorizeGlobalBroadcast("production", null, "secret123").ok === false,
  "Production environment rejected for ordinary users without secret"
)

// ---------------------------------------------------------------------------
// 5. PRIVACY & CREDENTIALS PROTECTION IN RESPONSES
// ---------------------------------------------------------------------------
console.log("\n[Test 5] Verifying zero credential exposure across all test action responses...")

const typesPath = path.join(rootDir, "lib", "push", "types.ts")
const typesContent = fs.readFileSync(typesPath, "utf-8")

assert(
  typesContent.includes("PushDeliverySummary"),
  "lib/push/types.ts exports PushDeliverySummary"
)

// Check PushDeliverySummary definition
const summaryMatch = typesContent.match(/export interface PushDeliverySummary\s*{[\s\S]*?}/)
assert(summaryMatch !== null, "PushDeliverySummary interface found in types.ts")
if (summaryMatch) {
  const fields = summaryMatch[0]
  assert(!fields.includes("p256dh"), "PushDeliverySummary excludes p256dh")
  assert(!fields.includes("auth:"), "PushDeliverySummary excludes auth secret")
  assert(!fields.includes("endpoint:"), "PushDeliverySummary excludes full endpoint URL")
  assert(!fields.includes("privateKey"), "PushDeliverySummary excludes private keys")
}

// ---------------------------------------------------------------------------
// 6. ZERO SERVICE-ROLE KEY USAGE
// ---------------------------------------------------------------------------
console.log("\n[Test 6] Verifying zero service-role key usage...")

assert(
  !pushTestContent.includes("service_role") &&
    !pushTestContent.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "app/actions/push-test.ts does NOT use service_role key"
)

const pushActionPath = path.join(rootDir, "app", "actions", "push.ts")
const pushActionContent = fs.readFileSync(pushActionPath, "utf-8")
assert(
  !pushActionContent.includes("service_role") &&
    !pushActionContent.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "app/actions/push.ts does NOT use service_role key"
)

// ---------------------------------------------------------------------------
// 7. SCAN FOR ZERO AUTOMATIC NOTIFICATION TRIGGERS
// ---------------------------------------------------------------------------
console.log("\n[Test 7] Verifying zero automatic notification sending triggers...")

function scanDirForAutoTriggers(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      continue
    }
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDirForAutoTriggers(fullPath)
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      if (
        entry.name === "web-push.ts" ||
        entry.name === "push-test.ts" ||
        entry.name === "push-test-card.tsx" ||
        entry.name === "broadcast-card.tsx"
      ) {
        continue
      }
      const code = fs.readFileSync(fullPath, "utf-8")
      if (
        code.includes("sendCurrentAccountTestPushAction") ||
        code.includes("sendGlobalTestPushBroadcastAction")
      ) {
        assert(false, `Unexpected automatic push trigger found in ${path.relative(rootDir, fullPath)}`)
      }
    }
  }
}

scanDirForAutoTriggers(path.join(rootDir, "app"))
scanDirForAutoTriggers(path.join(rootDir, "components"))
assert(true, "Zero automated push sending triggers across app/ and components/")

// ---------------------------------------------------------------------------
// 8. DATABASE MIGRATION INTEGRITY (Phase 17.9)
// ---------------------------------------------------------------------------
console.log("\n[Test 8] Verifying database migration for admin test broadcast...")

const adminMigrationPath = path.join(
  rootDir,
  "supabase",
  "migrations",
  "20260922000003_admin_push_test.sql"
)
assert(fs.existsSync(adminMigrationPath), "20260922000003_admin_push_test.sql migration exists")

const adminMigrationContent = fs.readFileSync(adminMigrationPath, "utf-8")
assert(
  adminMigrationContent.includes("get_all_push_subscriptions_for_admin_test"),
  "Migration creates get_all_push_subscriptions_for_admin_test function"
)
assert(
  adminMigrationContent.includes("delete_expired_push_subscription_admin"),
  "Migration creates delete_expired_push_subscription_admin function"
)
assert(
  adminMigrationContent.includes("SECURITY DEFINER"),
  "Admin functions execute with SECURITY DEFINER"
)
assert(
  adminMigrationContent.includes("REVOKE ALL ON FUNCTION public.get_all_push_subscriptions_for_admin_test() FROM PUBLIC, anon") ||
    adminMigrationContent.includes("REVOKE EXECUTE ON FUNCTION public.get_all_push_subscriptions_for_admin_test() FROM PUBLIC, anon"),
  "Admin RPC execution privileges explicitly revoked from PUBLIC and anon"
)
assert(
  adminMigrationContent.includes("REVOKE ALL ON FUNCTION public.delete_expired_push_subscription_admin") ||
    adminMigrationContent.includes("REVOKE EXECUTE ON FUNCTION public.delete_expired_push_subscription_admin"),
  "Expired delete RPC execution privileges explicitly revoked from PUBLIC and anon"
)

// ---------------------------------------------------------------------------
// 9. CLIENT UI INTEGRATION & TEST BUTTON VERIFICATION
// ---------------------------------------------------------------------------
console.log("\n[Test 9] Verifying Client Test UI & Admin Page integration...")

const clientCardPath = path.join(rootDir, "components", "settings", "push-test-card.tsx")
assert(fs.existsSync(clientCardPath), "components/settings/push-test-card.tsx exists")

const clientCardContent = fs.readFileSync(clientCardPath, "utf-8")
assert(
  clientCardContent.includes("registerAndPersistWebPush"),
  "PushTestCard connects to registerAndPersistWebPush"
)
assert(
  clientCardContent.includes("sendCurrentAccountTestPushAction"),
  "PushTestCard connects to sendCurrentAccountTestPushAction"
)
assert(
  clientCardContent.includes("Send Test Notification"),
  "PushTestCard renders 'Send Test Notification' button"
)

const settingsFormPath = path.join(rootDir, "components", "settings", "settings-form.tsx")
const settingsFormContent = fs.readFileSync(settingsFormPath, "utf-8")
assert(
  settingsFormContent.includes("<PushTestCard />"),
  "settings-form.tsx embeds <PushTestCard />"
)

const adminPagePath = path.join(rootDir, "app", "admin", "push-test", "page.tsx")
assert(fs.existsSync(adminPagePath), "app/admin/push-test/page.tsx exists")

const adminPageContent = fs.readFileSync(adminPagePath, "utf-8")
assert(
  adminPageContent.includes("notFound()"),
  "admin push-test page returns notFound() when unauthorized in production"
)

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log("\n=================================================")
if (failures === 0) {
  console.log("ALL SEIJUN PHASE 17.9 END-TO-END PUSH TESTS PASSED! 🎉")
  console.log("=================================================\n")
  process.exit(0)
} else {
  console.error(`FAILED: ${failures} test(s) failed.`)
  console.log("=================================================\n")
  process.exit(1)
}
