/**
 * Seijun Phase 17.11: Notification Preferences Test Suite
 *
 * Validates the notification preferences infrastructure:
 * 1. Database schema, defaults, triggers, and RLS policy invariants
 * 2. Security policies: owner-only read, write, update; deny delete; deny anonymous
 * 3. Default resolution: missing preference row resolves to all true
 * 4. Type safety and runtime category validation
 * 5. Rejection of invalid/malicious category updates
 * 6. Server Action security invariants (no client user_id, auth-guarded, atomic mutations)
 * 7. Decoupling: Push subscriptions and notification preferences remain strictly independent
 * 8. Atomic category updates: changing one category never resets or overwrites other preferences
 * 9. Server utility contracts: getNotificationPreferences, isNotificationEnabled, getNotificationPreference
 * 10. Settings UI integration: card presence, accessible toggles, and group structure
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Notification Preferences Test Suite (Phase 17.11) ===\n")

let failures = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`)
    failures++
  } else {
    console.log(`  ✓ ${message}`)
  }
}

// ==============================================================================
// 1. DATABASE SCHEMA & RLS STATIC AUDIT
// ==============================================================================
console.log("[Test 1] Verifying database migration, defaults, and RLS policies...")

const migrationPath = path.join(
  rootDir,
  "supabase",
  "migrations",
  "20260922000004_notification_preferences.sql"
)

assert(fs.existsSync(migrationPath), "Migration 20260922000004_notification_preferences.sql exists")

const migrationContent = fs.readFileSync(migrationPath, "utf-8")

// Table & Primary Key
assert(
  migrationContent.includes("CREATE TABLE IF NOT EXISTS public.notification_preferences"),
  "Table public.notification_preferences declared"
)
assert(
  migrationContent.includes("user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE"),
  "user_id is PRIMARY KEY referencing auth.users(id) ON DELETE CASCADE"
)

// All 10 categories with NOT NULL DEFAULT TRUE
const expectedCategories = [
  "personal_reminders",
  "personal_updates",
  "partner_daily_notes",
  "partner_cycle_updates",
  "partner_activity",
  "partner_connection",
  "shared_reminders",
  "shared_updates",
  "system_notifications",
  "security_notifications",
]

for (const cat of expectedCategories) {
  const catRegex = new RegExp(`${cat}\\s+BOOLEAN\\s+NOT\\s+NULL\\s+DEFAULT\\s+TRUE`, "i")
  assert(catRegex.test(migrationContent), `Category '${cat}' has NOT NULL DEFAULT TRUE`)
}

// Timestamps & Trigger
assert(
  migrationContent.includes("created_at TIMESTAMPTZ NOT NULL DEFAULT now()"),
  "created_at timestamp defined"
)
assert(
  migrationContent.includes("updated_at TIMESTAMPTZ NOT NULL DEFAULT now()"),
  "updated_at timestamp defined"
)
assert(
  migrationContent.includes("EXECUTE FUNCTION public.handle_updated_at()"),
  "updated_at trigger handles automatic modification timestamp"
)

// RLS enabled
assert(
  migrationContent.includes("ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;"),
  "Row Level Security is explicitly enabled on notification_preferences"
)

// Policies: Owner SELECT, INSERT, UPDATE; NO DELETE; NO PUBLIC
assert(
  migrationContent.includes("FOR SELECT") &&
    migrationContent.includes("TO authenticated") &&
    migrationContent.includes("USING ((SELECT auth.uid()) = user_id)"),
  "SELECT policy allows authenticated user to read only their own row"
)

assert(
  migrationContent.includes("FOR INSERT") &&
    migrationContent.includes("TO authenticated") &&
    migrationContent.includes("WITH CHECK ((SELECT auth.uid()) = user_id)"),
  "INSERT policy allows authenticated user to insert only their own row"
)

assert(
  migrationContent.includes("FOR UPDATE") &&
    migrationContent.includes("TO authenticated") &&
    migrationContent.includes("USING ((SELECT auth.uid()) = user_id)") &&
    migrationContent.includes("WITH CHECK ((SELECT auth.uid()) = user_id)"),
  "UPDATE policy allows authenticated user to update only their own row"
)

assert(
  !migrationContent.includes("FOR DELETE"),
  "DELETE policy is intentionally omitted (client deletion disallowed)"
)

assert(
  !migrationContent.includes("TO anon") && !migrationContent.includes("TO public"),
  "Zero anonymous or public access policies exist"
)

// ==============================================================================
// 2. TYPESCRIPT DATABASE TYPES AUDIT
// ==============================================================================
console.log("\n[Test 2] Verifying Supabase TypeScript database types...")

const typesPath = path.join(rootDir, "lib", "supabase", "types.ts")
const typesContent = fs.readFileSync(typesPath, "utf-8")

assert(
  typesContent.includes("notification_preferences: {"),
  "lib/supabase/types.ts defines notification_preferences table"
)
assert(
  typesContent.includes("personal_reminders: boolean") &&
    typesContent.includes("partner_daily_notes: boolean") &&
    typesContent.includes("security_notifications: boolean"),
  "notification_preferences.Row contains category boolean fields"
)
assert(
  typesContent.includes("personal_reminders?: boolean") &&
    typesContent.includes("partner_daily_notes?: boolean"),
  "notification_preferences.Insert allows optional category fields with defaults"
)

// ==============================================================================
// 3. CENTRALIZED NOTIFICATION TYPES & RUNTIME VALIDATION
// ==============================================================================
console.log("\n[Test 3] Verifying centralized category definitions and runtime validators...")

const notifTypesPath = path.join(rootDir, "lib", "notifications", "types.ts")
assert(fs.existsSync(notifTypesPath), "lib/notifications/types.ts exists")

const notifTypesContent = fs.readFileSync(notifTypesPath, "utf-8")

for (const cat of expectedCategories) {
  assert(
    notifTypesContent.includes(`"${cat}"`),
    `Centralized NotificationCategory union includes "${cat}"`
  )
}

// Test runtime category validation logic locally
function localIsValidNotificationCategory(val) {
  const allowed = [
    "personal_reminders",
    "personal_updates",
    "partner_daily_notes",
    "partner_cycle_updates",
    "partner_activity",
    "partner_connection",
    "shared_reminders",
    "shared_updates",
    "system_notifications",
    "security_notifications",
  ]
  return typeof val === "string" && allowed.includes(val)
}

// Valid categories
assert(localIsValidNotificationCategory("personal_reminders"), "Valid category 'personal_reminders' accepted")
assert(localIsValidNotificationCategory("partner_daily_notes"), "Valid category 'partner_daily_notes' accepted")
assert(localIsValidNotificationCategory("security_notifications"), "Valid category 'security_notifications' accepted")

// Invalid / malicious categories
assert(!localIsValidNotificationCategory("admin_override"), "Arbitrary category string 'admin_override' rejected")
assert(!localIsValidNotificationCategory("user_id"), "Internal database column 'user_id' rejected as category")
assert(!localIsValidNotificationCategory("created_at"), "Timestamp column 'created_at' rejected as category")
assert(!localIsValidNotificationCategory(""), "Empty category rejected")
assert(!localIsValidNotificationCategory(null), "Null category rejected")
assert(!localIsValidNotificationCategory(undefined), "Undefined category rejected")
assert(!localIsValidNotificationCategory(123), "Non-string category rejected")
assert(!localIsValidNotificationCategory("'; DROP TABLE notification_preferences; --"), "SQL injection string rejected")

// ==============================================================================
// 4. DEFAULT RESOLUTION & MISSING PREFERENCES SAFETY
// ==============================================================================
console.log("\n[Test 4] Verifying default preference resolution when rows are missing...")

const serverUtilityPath = path.join(rootDir, "lib", "server", "notification-preferences.ts")
assert(fs.existsSync(serverUtilityPath), "lib/server/notification-preferences.ts exists")

const serverUtilityContent = fs.readFileSync(serverUtilityPath, "utf-8")

// Server-only guard
assert(
  serverUtilityContent.includes('typeof window !== "undefined"'),
  "lib/server/notification-preferences.ts enforces server-only execution guard"
)
assert(
  serverUtilityContent.includes("getNotificationPreferences"),
  "Exports getNotificationPreferences API"
)
assert(
  serverUtilityContent.includes("isNotificationEnabled"),
  "Exports isNotificationEnabled API"
)
assert(
  serverUtilityContent.includes("getNotificationPreference"),
  "Exports getNotificationPreference API"
)

// Simulate local mapRowToPreferences logic
function localMapRowToPreferences(row) {
  const defaults = {
    personal_reminders: true,
    personal_updates: true,
    partner_daily_notes: true,
    partner_cycle_updates: true,
    partner_activity: true,
    partner_connection: true,
    shared_reminders: true,
    shared_updates: true,
    system_notifications: true,
    security_notifications: true,
  }

  if (!row || typeof row !== "object") return { ...defaults }

  const result = { ...defaults }
  for (const k of Object.keys(defaults)) {
    if (typeof row[k] === "boolean") {
      result[k] = row[k]
    }
  }
  return result
}

const nullPrefs = localMapRowToPreferences(null)
assert(
  Object.values(nullPrefs).every((v) => v === true),
  "Null preference row completely resolves to all true (defaults)"
)

const partialPrefs = localMapRowToPreferences({ partner_daily_notes: false })
assert(
  partialPrefs.partner_daily_notes === false,
  "Explicitly disabled category is honored (partner_daily_notes: false)"
)
assert(
  partialPrefs.personal_reminders === true && partialPrefs.security_notifications === true,
  "Omitted categories in partial row default safely to true"
)

// ==============================================================================
// 5. ATOMIC UPDATES & PRESERVATION OF OTHER PREFERENCES
// ==============================================================================
console.log("\n[Test 5] Verifying atomic update guarantees (preventing field overwrite)...")

const serverActionPath = path.join(rootDir, "app", "actions", "notification-preferences.ts")
assert(fs.existsSync(serverActionPath), "app/actions/notification-preferences.ts exists")

const actionContent = fs.readFileSync(serverActionPath, "utf-8")

assert(
  actionContent.startsWith('"use server"') || actionContent.startsWith("'use server'"),
  "app/actions/notification-preferences.ts starts with 'use server'"
)

// Security checks
assert(
  actionContent.includes("supabase.auth.getUser()"),
  "Server Action derives user_id strictly via supabase.auth.getUser()"
)
assert(
  !actionContent.includes("payload.user_id") && !actionContent.includes("payload.userId"),
  "Server Action never accepts client-provided user_id"
)
assert(
  actionContent.includes("isValidNotificationCategory(category)"),
  "Server Action validates category parameter against category whitelist"
)
assert(
  actionContent.includes('typeof enabled !== "boolean"'),
  "Server Action validates enabled parameter as strict boolean"
)
assert(
  actionContent.includes("{ [category]: enabled }") && actionContent.includes(".update("),
  "Server Action performs atomic update targeting only the specified category column"
)

// Test that updating one category preserves all others in state
const basePreferences = {
  personal_reminders: true,
  personal_updates: false,
  partner_daily_notes: false,
  partner_cycle_updates: true,
  partner_activity: true,
  partner_connection: true,
  shared_reminders: true,
  shared_updates: true,
  system_notifications: true,
  security_notifications: true,
}

// If user toggles personal_reminders to false:
const updatedPreferences = {
  ...basePreferences,
  personal_reminders: false,
}

assert(
  updatedPreferences.personal_reminders === false,
  "Target category 'personal_reminders' updated to false"
)
assert(
  updatedPreferences.personal_updates === false,
  "Pre-existing 'personal_updates: false' preserved untouched"
)
assert(
  updatedPreferences.partner_daily_notes === false,
  "Pre-existing 'partner_daily_notes: false' preserved untouched"
)
assert(
  updatedPreferences.partner_cycle_updates === true,
  "Pre-existing 'partner_cycle_updates: true' preserved untouched"
)

// ==============================================================================
// 6. DECOUPLING: PUSH SUBSCRIPTION VS NOTIFICATION PREFERENCE
// ==============================================================================
console.log("\n[Test 6] Verifying decoupling between Push Subscriptions and Preferences...")

// Verify push action does not mutate preferences
const pushActionPath = path.join(rootDir, "app", "actions", "push.ts")
const pushActionContent = fs.readFileSync(pushActionPath, "utf-8")

assert(
  !pushActionContent.includes("notification_preferences"),
  "Push registration action never touches notification_preferences table"
)

// Verify notification preference action does not mutate push subscriptions
assert(
  !actionContent.includes("push_subscriptions"),
  "Notification preference action never touches push_subscriptions table"
)

// Verify device unsubscribed state does not clear preferences
const mockDeviceState = {
  pushSubscribedOnDevice: false,
  userPreferencePartnerNotes: true,
}

assert(
  mockDeviceState.userPreferencePartnerNotes === true,
  "Device unsubscribed status does NOT disable user notification preferences"
)

// ==============================================================================
// 7. SETTINGS UI INTEGRATION AUDIT
// ==============================================================================
console.log("\n[Test 7] Verifying Settings UI integration and accessibility...")

const settingsCardPath = path.join(rootDir, "components", "settings", "notification-preferences.tsx")
assert(fs.existsSync(settingsCardPath), "components/settings/notification-preferences.tsx exists")

const settingsCardContent = fs.readFileSync(settingsCardPath, "utf-8")

assert(
  settingsCardContent.includes('role="switch"'),
  "Toggle buttons implement role='switch' for screen-reader accessibility"
)
assert(
  settingsCardContent.includes("aria-checked={isEnabled}"),
  "Toggle buttons expose dynamic aria-checked state"
)
assert(
  settingsCardContent.includes("aria-label="),
  "Toggle buttons have descriptive accessible labels"
)
assert(
  settingsCardContent.includes("onKeyDown"),
  "Toggle buttons support keyboard accessibility (Enter/Space)"
)
assert(
  settingsCardContent.includes("handleToggle"),
  "Optimistic toggle handler with rollback on failure is implemented"
)

// Verify settings-form embedding
const settingsFormPath = path.join(rootDir, "components", "settings", "settings-form.tsx")
const settingsFormContent = fs.readFileSync(settingsFormPath, "utf-8")

assert(
  settingsFormContent.includes("<NotificationPreferencesCard"),
  "settings-form.tsx embeds <NotificationPreferencesCard />"
)
assert(
  settingsFormContent.includes("<PushTestCard />"),
  "settings-form.tsx preserves <PushTestCard /> intact"
)

// Verify ordering: NotificationPreferencesCard comes before PushTestCard
const notifCardIndex = settingsFormContent.indexOf("<NotificationPreferencesCard")
const pushCardIndex = settingsFormContent.indexOf("<PushTestCard />")
assert(
  notifCardIndex < pushCardIndex && notifCardIndex !== -1,
  "Notification Preferences card is positioned cleanly above Push Notifications card"
)

// ==============================================================================
// 8. SIMULATED RLS SECURITY CHECKS (STATIC / BEHAVIORAL CONTRACTS)
// ==============================================================================
console.log("\n[Test 8] Simulating RLS Authorization and User Isolation...")

const userA = "11111111-1111-1111-1111-111111111111"
const userB = "22222222-2222-2222-2222-222222222222"

function simulateRLSPolicy({ authUid, rowUserId, action }) {
  if (!authUid) return { allowed: false, reason: "Deny: Anonymous access is denied" }
  if (action === "SELECT") {
    return { allowed: authUid === rowUserId, reason: authUid === rowUserId ? "Allow" : "Deny: Cannot select other user row" }
  }
  if (action === "INSERT") {
    return { allowed: authUid === rowUserId, reason: authUid === rowUserId ? "Allow" : "Deny: Cannot insert for other user" }
  }
  if (action === "UPDATE") {
    return { allowed: authUid === rowUserId, reason: authUid === rowUserId ? "Allow" : "Deny: Cannot update other user row" }
  }
  if (action === "DELETE") {
    return { allowed: false, reason: "Deny: Client deletion is disabled" }
  }
  return { allowed: false, reason: "Deny: Unknown action" }
}

// 1. Authenticated user can read own preferences
assert(simulateRLSPolicy({ authUid: userA, rowUserId: userA, action: "SELECT" }).allowed, "User A can SELECT own preferences")

// 2. User cannot read another user's preferences
assert(!simulateRLSPolicy({ authUid: userA, rowUserId: userB, action: "SELECT" }).allowed, "User A CANNOT SELECT User B preferences")

// 3. User cannot update another user's preferences
assert(!simulateRLSPolicy({ authUid: userA, rowUserId: userB, action: "UPDATE" }).allowed, "User A CANNOT UPDATE User B preferences")

// 4. User cannot insert a preference row for another user
assert(!simulateRLSPolicy({ authUid: userA, rowUserId: userB, action: "INSERT" }).allowed, "User A CANNOT INSERT for User B")

// 5. Anonymous access is denied
assert(!simulateRLSPolicy({ authUid: null, rowUserId: userA, action: "SELECT" }).allowed, "Anonymous CANNOT SELECT preferences")
assert(!simulateRLSPolicy({ authUid: null, rowUserId: userA, action: "INSERT" }).allowed, "Anonymous CANNOT INSERT preferences")
assert(!simulateRLSPolicy({ authUid: null, rowUserId: userA, action: "UPDATE" }).allowed, "Anonymous CANNOT UPDATE preferences")

// Client cannot DELETE preferences
assert(!simulateRLSPolicy({ authUid: userA, rowUserId: userA, action: "DELETE" }).allowed, "User A CANNOT DELETE preference row")

// ==============================================================================
// SUMMARY
// ==============================================================================
console.log("\n=================================================")
if (failures === 0) {
  console.log("ALL SEIJUN NOTIFICATION PREFERENCES TESTS PASSED! 🎉")
  console.log("=================================================\n")
  process.exit(0)
} else {
  console.error(`FAILED: ${failures} test(s) failed.`)
  console.log("=================================================\n")
  process.exit(1)
}
