import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

const require = createRequire(import.meta.url)
const sw = require(path.join(rootDir, "public", "sw.js"))

console.log("=== Running Seijun Notification Click Test Suite (Phase 17.10) ===\n")

let failures = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`)
    failures++
  } else {
    console.log(`  ✓ ${message}`)
  }
}

const TEST_ORIGIN = "https://seijun.app"
const LOCAL_ORIGIN = "http://localhost:3000"

// ---------------------------------------------------------------------------
// 1. URL NORMALIZATION & SAME-ORIGIN SECURITY TESTS
// ---------------------------------------------------------------------------
console.log("[Test 1-10] Testing destination URL resolution & security validation...")

// Test 1: Default fallback when no URL supplied
const dest1 = sw.resolveNotificationDestination({}, TEST_ORIGIN)
assert(dest1 === "/dashboard", `1. Default fallback without URL yields '/dashboard' (got '${dest1}')`)

const dest1b = sw.resolveNotificationDestination(null, TEST_ORIGIN)
assert(dest1b === "/dashboard", `1b. Default fallback for null notification yields '/dashboard' (got '${dest1b}')`)

const dest1c = sw.resolveNotificationDestination({ data: {} }, TEST_ORIGIN)
assert(dest1c === "/dashboard", `1c. Default fallback for empty data object yields '/dashboard' (got '${dest1c}')`)

// Test 2: Valid relative route
const dest2 = sw.resolveNotificationDestination({ data: { url: "/cycles" } }, TEST_ORIGIN)
assert(dest2 === "/cycles", `2. Valid relative route '/cycles' preserved (got '${dest2}')`)

// Test 3: Valid nested route
const dest3 = sw.resolveNotificationDestination({ data: { url: "/partner/activity" } }, TEST_ORIGIN)
assert(dest3 === "/partner/activity", `3. Valid nested route '/partner/activity' preserved (got '${dest3}')`)

// Test 4: Valid query string
const dest4 = sw.resolveNotificationDestination({ data: { url: "/cycles?open=latest" } }, TEST_ORIGIN)
assert(dest4 === "/cycles?open=latest", `4. Valid route with query string preserved (got '${dest4}')`)

const dest4b = sw.resolveNotificationDestination({ data: { url: "/partner?tab=activity#section" } }, TEST_ORIGIN)
assert(dest4b === "/partner?tab=activity#section", `4b. Route with query string and hash fragment preserved (got '${dest4b}')`)

// Test 5: Valid absolute same-origin URL
const dest5 = sw.resolveNotificationDestination({ data: { url: "https://seijun.app/dashboard" } }, TEST_ORIGIN)
assert(dest5 === "/dashboard", `5. Absolute same-origin URL normalized safely to relative path (got '${dest5}')`)

const dest5b = sw.resolveNotificationDestination({ data: { url: "http://localhost:3000/cycles" } }, LOCAL_ORIGIN)
assert(dest5b === "/cycles", `5b. Local development same-origin HTTP URL normalized safely (got '${dest5b}')`)

// Test 6: External URL rejected
const dest6 = sw.resolveNotificationDestination({ data: { url: "https://example.com" } }, TEST_ORIGIN)
assert(dest6 === "/dashboard", `6. External URL 'https://example.com' rejected -> fallback '/dashboard' (got '${dest6}')`)

const dest6b = sw.resolveNotificationDestination({ data: { url: "https://attacker.com/cycles" } }, TEST_ORIGIN)
assert(dest6b === "/dashboard", `6b. External domain 'https://attacker.com/cycles' rejected -> fallback '/dashboard' (got '${dest6b}')`)

const dest6c = sw.resolveNotificationDestination({ data: { url: "//example.com/evil" } }, TEST_ORIGIN)
assert(dest6c === "/dashboard", `6c. Protocol-relative URL '//example.com/evil' rejected -> fallback '/dashboard' (got '${dest6c}')`)

// Test 7: javascript: URL rejected
const dest7 = sw.resolveNotificationDestination({ data: { url: "javascript:alert(1)" } }, TEST_ORIGIN)
assert(dest7 === "/dashboard", `7. javascript: pseudo-protocol rejected -> fallback '/dashboard' (got '${dest7}')`)

const dest7b = sw.resolveNotificationDestination({ data: { url: "JAVASCRIPT:void(0)" } }, TEST_ORIGIN)
assert(dest7b === "/dashboard", `7b. Case-insensitive JAVASCRIPT: rejected -> fallback '/dashboard' (got '${dest7b}')`)

// Test 8: data: URL rejected
const dest8 = sw.resolveNotificationDestination({ data: { url: "data:text/html,<h1>Attacker</h1>" } }, TEST_ORIGIN)
assert(dest8 === "/dashboard", `8. data: URL scheme rejected -> fallback '/dashboard' (got '${dest8}')`)

const dest8b = sw.resolveNotificationDestination({ data: { url: "blob:https://seijun.app/uuid" } }, TEST_ORIGIN)
assert(dest8b === "/dashboard", `8b. blob: URL scheme rejected -> fallback '/dashboard' (got '${dest8b}')`)

// Test 9: Malformed URL rejected
const dest9 = sw.resolveNotificationDestination({ data: { url: "ht!tp://invalid-url::" } }, TEST_ORIGIN)
assert(dest9 === "/dashboard", `9. Malformed URL rejected -> fallback '/dashboard' (got '${dest9}')`)

const dest9b = sw.resolveNotificationDestination({ data: { url: "" } }, TEST_ORIGIN)
assert(dest9b === "/dashboard", `9b. Empty string URL rejected -> fallback '/dashboard' (got '${dest9b}')`)

const dest9c = sw.resolveNotificationDestination({ data: { url: "   " } }, TEST_ORIGIN)
assert(dest9c === "/dashboard", `9c. Whitespace-only URL rejected -> fallback '/dashboard' (got '${dest9c}')`)

// Test 10: data.url precedence over fallback/top-level
const dest10 = sw.resolveNotificationDestination(
  {
    url: "/fallback",
    data: { url: "/cycles" },
  },
  TEST_ORIGIN
)
assert(dest10 === "/cycles", `10. data.url takes precedence over top-level url (got '${dest10}')`)

// Top-level url supported when data is not an object or lacks url
const dest10b = sw.resolveNotificationDestination(
  {
    url: "/partner",
  },
  TEST_ORIGIN
)
assert(dest10b === "/partner", `10b. Top-level url supported for backward compatibility (got '${dest10b}')`)

// data as string supported
const dest10c = sw.resolveNotificationDestination(
  {
    data: "/cycles",
  },
  TEST_ORIGIN
)
assert(dest10c === "/cycles", `10c. String notification.data supported (got '${dest10c}')`)

// ---------------------------------------------------------------------------
// 11. EXISTING CLIENT HANDLING & CLIENT SELECTION
// ---------------------------------------------------------------------------
console.log("\n[Test 11] Testing window client selection and focus/navigate handling...")

function createMockClient(url, focused = false) {
  const actions = []
  return {
    url,
    focused,
    actions,
    focus: async function () {
      actions.push("focus")
      this.focused = true
      return this
    },
    navigate: async function (dest) {
      actions.push(`navigate:${dest}`)
      this.url = dest
      return this
    },
  }
}

// Client selection logic
const clientA = createMockClient("https://seijun.app/dashboard", false)
const clientB = createMockClient("https://seijun.app/settings", true)
const externalClient = createMockClient("https://other-domain.com/dashboard", true)

const selected = sw.findBestWindowClient([clientA, externalClient, clientB], TEST_ORIGIN)
assert(selected === clientB, "findBestWindowClient prefers currently focused same-origin client")

const selectedUnfocused = sw.findBestWindowClient([externalClient, clientA], TEST_ORIGIN)
assert(selectedUnfocused === clientA, "findBestWindowClient selects same-origin client over external client")

const selectedNone = sw.findBestWindowClient([externalClient], TEST_ORIGIN)
assert(selectedNone === null, "findBestWindowClient returns null when no same-origin client exists")

// Integration simulation of handleNotificationClick with existing client
let notificationClosed = false
const mockNotification = {
  close: () => {
    notificationClosed = true
  },
  data: { url: "/cycles" },
}

let openWindowCalls = []
const mockContextExisting = {
  location: { origin: TEST_ORIGIN },
  clients: {
    matchAll: async () => [clientA],
    openWindow: async (url) => {
      openWindowCalls.push(url)
      return createMockClient(url, true)
    },
  },
}

await sw.handleNotificationClick({ notification: mockNotification }, mockContextExisting)
assert(notificationClosed === true, "Notification was closed on click")
assert(clientA.actions.includes("focus"), "Existing same-origin client was focused")
assert(
  clientA.actions.includes(`navigate:${TEST_ORIGIN}/cycles`),
  `Existing same-origin client was navigated to '${TEST_ORIGIN}/cycles'`
)
assert(openWindowCalls.length === 0, "openWindow was NOT called when existing client was available")

// ---------------------------------------------------------------------------
// 12. NO EXISTING CLIENT FALLBACK BEHAVIOR
// ---------------------------------------------------------------------------
console.log("\n[Test 12] Testing fallback behavior when no existing client exists...")

notificationClosed = false
openWindowCalls = []
const mockContextEmpty = {
  location: { origin: TEST_ORIGIN },
  clients: {
    matchAll: async () => [externalClient], // Only unrelated external client
    openWindow: async (url) => {
      openWindowCalls.push(url)
      return createMockClient(url, true)
    },
  },
}

const mockNotification2 = {
  close: () => {
    notificationClosed = true
  },
  data: { url: "/partner/activity" },
}

await sw.handleNotificationClick({ notification: mockNotification2 }, mockContextEmpty)
assert(notificationClosed === true, "Notification was closed when opening new window")
assert(openWindowCalls.length === 1, "clients.openWindow was invoked exactly once")
assert(
  openWindowCalls[0] === `${TEST_ORIGIN}/partner/activity`,
  `clients.openWindow opened target destination '${TEST_ORIGIN}/partner/activity'`
)

// ---------------------------------------------------------------------------
// 13. SERVICE WORKER SOURCE CODE & SECURITY AUDIT
// ---------------------------------------------------------------------------
console.log("\n[Test 13] Verifying Service Worker architectural & security invariants...")

const swPath = path.join(rootDir, "public", "sw.js")
assert(fs.existsSync(swPath), "public/sw.js exists")

const swContent = fs.readFileSync(swPath, "utf-8")

// Fetch-safe policy confirmation
assert(
  !swContent.includes('addEventListener("fetch"') && !swContent.includes("addEventListener('fetch'"),
  "Zero fetch event listeners registered (preserves Next.js hydration & server actions)"
)

// Zero caching confirmation
assert(
  !swContent.includes("caches.open") && !swContent.includes("caches.match"),
  "Zero offline caching handlers (prevents stale authentication/API state)"
)

// Lifecycle preservation
assert(swContent.includes("self.skipWaiting()"), "self.skipWaiting() preserved for instant updates")
assert(swContent.includes("self.clients.claim()"), "self.clients.claim() preserved for active scope control")

// Notification close confirmation
assert(swContent.includes("event.notification.close()"), "event.notification.close() called on notificationclick")

// No dangerous / server credentials
assert(!swContent.includes("process.env"), "Zero process.env references in public/sw.js")
assert(!swContent.includes("Buffer."), "Zero Node Buffer references in public/sw.js")
assert(!swContent.includes("fs."), "Zero filesystem API references in public/sw.js")
assert(!swContent.includes("service_role"), "Zero Supabase service_role references in public/sw.js")
assert(!swContent.includes("VAPID_PRIVATE_KEY"), "Zero VAPID private key references in public/sw.js")

// Generic routing check (no premature business logic)
const businessKeywords = [
  "periodTracker",
  "ovulationPrediction",
  "logSymptom",
  "dailyMood",
  "partnerInvitation",
  "cycleDayCalculation",
]
let hasBusinessLogic = false
for (const kw of businessKeywords) {
  if (swContent.includes(kw)) {
    hasBusinessLogic = true
    console.error(`  ❌ Found business logic keyword in sw.js: "${kw}"`)
  }
}
assert(!hasBusinessLogic, "Service Worker contains purely generic routing, zero business logic")

// ---------------------------------------------------------------------------
// RESULTS SUMMARY
// ---------------------------------------------------------------------------
console.log("\n=================================================")
if (failures > 0) {
  console.error(`❌ ${failures} NOTIFICATION CLICK TESTS FAILED!`)
  process.exit(1)
} else {
  console.log("ALL SEIJUN NOTIFICATION CLICK TESTS PASSED! 🎉 (13/13)")
  console.log("=================================================\n")
}
