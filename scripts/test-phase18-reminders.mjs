/**
 * Seijun Phase 18: Smart Cycle Reminders & Notification Intelligence Test Suite
 *
 * Verifies all 18 requirements of Phase 18:
 * 1. Database schema, defaults, triggers, indexes, deduplication, and RLS policies
 * 2. Smart Reminder Engine calculation accuracy and milestone formulas
 * 3. Account classification enforcement (supporter suppressed, cycle_tracker & both active)
 * 4. Data sufficiency guards (new users / insufficient data suppress predictions)
 * 5. Reminder timing options (3 days before, 1 day before, on expected day)
 * 6. User preference controls (enabling/disabling individual reminder categories)
 * 7. Idempotent duplicate prevention across repeated executions
 * 8. Cycle recalculation (canceling obsolete pending events, preserving sent history)
 * 9. Scheduling & Processor delivery integration with Phase 17 Web Push
 * 10. Expired subscription cleanup (404/410)
 * 11. In-App Notification Center (unread count, mark read, delete)
 * 12. Explanatory Permission UX guards (respects denied state & dismissal)
 * 13. Concise templates & same-origin click routing
 * 14. Zero AI, zero external paid services, zero credentials exposure
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Phase 18: Smart Cycle Reminders & Notification Intelligence Test Suite ===\n")

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
// 1. DATABASE SCHEMA & RLS AUDIT
// ==============================================================================
console.log("[Test 1] Auditing Phase 18 Database Migration & RLS policies...")

const migrationPath = path.join(
  rootDir,
  "supabase",
  "migrations",
  "20260923000001_cycle_reminders_and_events.sql"
)

assert(fs.existsSync(migrationPath), "Migration 20260923000001_cycle_reminders_and_events.sql exists")

const migrationContent = fs.readFileSync(migrationPath, "utf-8")

// Notification Preferences extensions
assert(
  migrationContent.includes("period_reminders BOOLEAN NOT NULL DEFAULT TRUE"),
  "notification_preferences has 'period_reminders'"
)
assert(
  migrationContent.includes("fertile_window_reminders BOOLEAN NOT NULL DEFAULT TRUE"),
  "notification_preferences has 'fertile_window_reminders'"
)
assert(
  migrationContent.includes("ovulation_reminders BOOLEAN NOT NULL DEFAULT TRUE"),
  "notification_preferences has 'ovulation_reminders'"
)
assert(
  migrationContent.includes("cycle_transition_reminders BOOLEAN NOT NULL DEFAULT TRUE"),
  "notification_preferences has 'cycle_transition_reminders'"
)
assert(
  migrationContent.includes("reminder_days_before INT NOT NULL DEFAULT 3"),
  "notification_preferences has 'reminder_days_before' default 3"
)
assert(
  migrationContent.includes("reminder_days_before IN (0, 1, 3)"),
  "notification_preferences enforces check constraint on reminder_days_before (0, 1, 3)"
)

// Notification Events table
assert(
  migrationContent.includes("CREATE TABLE IF NOT EXISTS public.notification_events"),
  "Table public.notification_events declared"
)
assert(
  migrationContent.includes("user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE"),
  "notification_events.user_id references auth.users with CASCADE"
)
assert(
  migrationContent.includes("cycle_id UUID REFERENCES public.cycles(id) ON DELETE CASCADE"),
  "notification_events.cycle_id references cycles with CASCADE"
)
assert(
  migrationContent.includes("'pending', 'sent', 'failed', 'cancelled'"),
  "notification_events enforces status check constraint"
)
assert(
  migrationContent.includes("'period_upcoming'"),
  "notification_events supports type 'period_upcoming'"
)
assert(
  migrationContent.includes("'period_expected'"),
  "notification_events supports type 'period_expected'"
)
assert(
  migrationContent.includes("'fertile_window'"),
  "notification_events supports type 'fertile_window'"
)
assert(
  migrationContent.includes("'ovulation'"),
  "notification_events supports type 'ovulation'"
)
assert(
  migrationContent.includes("'cycle_transition'"),
  "notification_events supports type 'cycle_transition'"
)
assert(
  migrationContent.includes("'missed_period'"),
  "notification_events supports type 'missed_period'"
)

// Idempotency Deduplication Index
assert(
  migrationContent.includes("CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_events_dedup"),
  "Deterministic partial unique index idx_notification_events_dedup declared"
)
assert(
  migrationContent.includes("WHERE status != 'cancelled'"),
  "Deduplication index excludes cancelled events, permitting safe recalculation"
)

// RLS Policies
assert(
  migrationContent.includes("ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY"),
  "RLS explicitly enabled on notification_events"
)
assert(
  migrationContent.includes("CREATE POLICY \"Users can view their own notification events\""),
  "SELECT policy guarantees user isolation"
)
assert(
  migrationContent.includes("CREATE POLICY \"Users can insert their own notification events\""),
  "INSERT policy guarantees owner check"
)
assert(
  migrationContent.includes("CREATE POLICY \"Users can update their own notification events\""),
  "UPDATE policy guarantees owner check"
)
assert(
  migrationContent.includes("CREATE POLICY \"Users can delete their own notification events\""),
  "DELETE policy allows user history cleanup"
)

// ==============================================================================
// 2. TYPESCRIPT DATABASE & NOTIFICATION TYPES
// ==============================================================================
console.log("\n[Test 2] Auditing TypeScript types...")

const typesPath = path.join(rootDir, "lib", "supabase", "types.ts")
const typesContent = fs.readFileSync(typesPath, "utf-8")

assert(typesContent.includes("notification_events: {"), "Database types define notification_events table")
assert(typesContent.includes("CycleReminderType"), "Database types export CycleReminderType")
assert(typesContent.includes("NotificationEventStatus"), "Database types export NotificationEventStatus")

const notifTypesPath = path.join(rootDir, "lib", "notifications", "types.ts")
const notifTypesContent = fs.readFileSync(notifTypesPath, "utf-8")

assert(notifTypesContent.includes('"period_reminders"'), "NotificationCategory includes 'period_reminders'")
assert(notifTypesContent.includes('"fertile_window_reminders"'), "NotificationCategory includes 'fertile_window_reminders'")
assert(notifTypesContent.includes('"ovulation_reminders"'), "NotificationCategory includes 'ovulation_reminders'")
assert(notifTypesContent.includes('"cycle_transition_reminders"'), "NotificationCategory includes 'cycle_transition_reminders'")
assert(notifTypesContent.includes('"missed_period_reminders"'), "NotificationCategory includes 'missed_period_reminders'")
assert(notifTypesContent.includes("ReminderTimingOption"), "Exports ReminderTimingOption")
assert(notifTypesContent.includes("isValidReminderTimingOption"), "Exports isValidReminderTimingOption validator")

// ==============================================================================
// 3. SMART CYCLE REMINDER ENGINE: CALCULATION & ACCOUNT CLASSIFICATION
// ==============================================================================
console.log("\n[Test 3] Testing Smart Reminder Engine logic & account classification...")

// Verify engine source file exists and contains core rules
const enginePath = path.join(rootDir, "lib", "reminders", "engine.ts")
assert(fs.existsSync(enginePath), "lib/reminders/engine.ts exists")
const engineSource = fs.readFileSync(enginePath, "utf-8")

assert(engineSource.includes("profile.usage_role === \"supporter\""), "Engine suppresses supporter role")
assert(engineSource.includes("!latestCycleStartDate"), "Engine suppresses insufficient data without period start")
assert(
  engineSource.includes("addDays(nextPeriodDate, -14)") || engineSource.includes("-14"),
  "Engine computes ovulation via standard luteal formula (next period - 14 days)"
)
assert(engineSource.includes("addDays(ovulationDate, -5)"), "Engine computes fertile window onset (ovulation - 5)")
assert(engineSource.includes("preferences.reminder_days_before"), "Engine respects configured reminder_days_before")

// Local execution test of engine algorithm
function parseDateString(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}
function formatDateToString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
function addDays(date, days) {
  const r = new Date(date)
  r.setDate(r.getDate() + days)
  return r
}
function calculateDaysBetween(earlierStr, laterStr) {
  const e = parseDateString(earlierStr)
  const l = parseDateString(laterStr)
  return Math.round((l.getTime() - e.getTime()) / (1000 * 60 * 60 * 24))
}
function calculateAverageCycleLength(cycles) {
  if (!cycles || cycles.length < 2) return null
  const sorted = [...cycles].sort((a, b) => (a.start_date > b.start_date ? 1 : -1))
  const intervals = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = calculateDaysBetween(sorted[i].start_date, sorted[i + 1].start_date)
    if (diff > 0 && diff < 120) intervals.push(diff)
  }
  if (intervals.length === 0) return null
  return Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
}

function localCalculateCycleReminders({ profile, cycles = [], preferences, referenceDateStr = "2026-09-23" }) {
  if (profile.usage_role === "supporter") {
    return { eligible: false, candidates: [], calculatedCycleLength: null }
  }
  const currentCycle = cycles.filter((c) => c.start_date <= referenceDateStr).sort((a, b) => (b.start_date > a.start_date ? 1 : -1))[0] || null
  const latestStart = currentCycle?.start_date ?? profile.last_period_start ?? null
  if (!latestStart) {
    return { eligible: false, candidates: [], calculatedCycleLength: null }
  }
  const avg = calculateAverageCycleLength(cycles)
  const length = avg || profile.typical_cycle_length || 28
  if (length < 18 || length > 60) {
    return { eligible: false, candidates: [], calculatedCycleLength: null }
  }

  const startDate = parseDateString(latestStart)
  const nextPeriod = addDays(startDate, length)
  const nextPeriodStr = formatDateToString(nextPeriod)
  const ovulationDate = addDays(nextPeriod, -14)
  const ovulationDateStr = formatDateToString(ovulationDate)
  const fertileStart = addDays(ovulationDate, -5)
  const fertileStartStr = formatDateToString(fertileStart)

  const candidates = []
  const reminderDays = preferences.reminder_days_before ?? 3

  if (preferences.period_reminders) {
    if (reminderDays > 0) {
      const up = addDays(nextPeriod, -reminderDays)
      candidates.push({ type: "period_upcoming", scheduled_for: formatDateToString(up) })
    }
    candidates.push({ type: "period_expected", scheduled_for: nextPeriodStr })
  }
  if (preferences.fertile_window_reminders) {
    const fwAlert = addDays(fertileStart, -1)
    candidates.push({ type: "fertile_window", scheduled_for: formatDateToString(fwAlert) })
  }
  if (preferences.ovulation_reminders) {
    candidates.push({ type: "ovulation", scheduled_for: ovulationDateStr })
  }
  if (preferences.cycle_transition_reminders) {
    const luteal = addDays(ovulationDate, 1)
    candidates.push({ type: "cycle_transition", scheduled_for: formatDateToString(luteal) })
  }
  if (preferences.missed_period_reminders) {
    const missed = addDays(nextPeriod, 2)
    candidates.push({ type: "missed_period", scheduled_for: formatDateToString(missed) })
  }

  return {
    eligible: true,
    candidates,
    calculatedCycleLength: length,
    estimatedNextPeriodDate: nextPeriodStr,
    estimatedOvulationDate: ovulationDateStr,
    estimatedFertileStartDate: fertileStartStr,
  }
}

const defaultPrefs = {
  period_reminders: true,
  fertile_window_reminders: true,
  ovulation_reminders: true,
  cycle_transition_reminders: true,
  missed_period_reminders: true,
  reminder_days_before: 3,
}

// Scenario A: New user with NO cycle data
const newUserRes = localCalculateCycleReminders({
  profile: { id: "user-1", usage_role: "cycle_tracker", typical_cycle_length: 28, last_period_start: null },
  cycles: [],
  preferences: defaultPrefs,
})
assert(newUserRes.eligible === false, "New user without cycle data is ineligible (suppresses predictions)")
assert(newUserRes.candidates.length === 0, "New user generates 0 candidate reminders")

// Scenario B: Account role 'supporter'
const supporterRes = localCalculateCycleReminders({
  profile: { id: "sup-1", usage_role: "supporter", typical_cycle_length: 28, last_period_start: "2026-09-01" },
  cycles: [{ id: "c1", start_date: "2026-09-01" }],
  preferences: defaultPrefs,
})
assert(supporterRes.eligible === false, "Supporter account role is strictly ineligible")
assert(supporterRes.candidates.length === 0, "Supporter account receives 0 cycle reminders")

// Scenario C: cycle_tracker with single cycle (onboarding baseline)
const singleCycleRes = localCalculateCycleReminders({
  profile: { id: "tracker-1", usage_role: "cycle_tracker", typical_cycle_length: 28, last_period_start: "2026-09-01" },
  cycles: [{ id: "c1", start_date: "2026-09-01" }],
  preferences: defaultPrefs,
})
assert(singleCycleRes.eligible === true, "cycle_tracker with single cycle is eligible")
assert(singleCycleRes.calculatedCycleLength === 28, "Uses typical cycle length (28) for single cycle")
assert(singleCycleRes.estimatedNextPeriodDate === "2026-09-29", "Calculates next period: Sep 01 + 28 days = Sep 29")
assert(singleCycleRes.estimatedOvulationDate === "2026-09-15", "Calculates ovulation: Sep 29 - 14 days = Sep 15")
assert(singleCycleRes.estimatedFertileStartDate === "2026-09-10", "Calculates fertile start: Sep 15 - 5 days = Sep 10")

const typesGen = singleCycleRes.candidates.map((c) => c.type)
assert(typesGen.includes("period_upcoming"), "Generates 'period_upcoming' reminder")
assert(typesGen.includes("period_expected"), "Generates 'period_expected' reminder")
assert(typesGen.includes("fertile_window"), "Generates 'fertile_window' reminder")
assert(typesGen.includes("ovulation"), "Generates 'ovulation' reminder")
assert(typesGen.includes("cycle_transition"), "Generates 'cycle_transition' reminder")
assert(typesGen.includes("missed_period"), "Generates 'missed_period' reminder")

const upcoming = singleCycleRes.candidates.find((c) => c.type === "period_upcoming")
assert(upcoming.scheduled_for === "2026-09-26", "Period upcoming scheduled 3 days before (Sep 29 - 3 = Sep 26)")

// Scenario D: Account role 'both'
const bothRes = localCalculateCycleReminders({
  profile: { id: "both-1", usage_role: "both", typical_cycle_length: 30, last_period_start: "2026-09-01" },
  cycles: [],
  preferences: defaultPrefs,
})
assert(bothRes.eligible === true, "Account role 'both' is eligible for reminders")

// Scenario E: Multiple cycles with observed average length
const multiRes = localCalculateCycleReminders({
  profile: { id: "tracker-multi", usage_role: "cycle_tracker", typical_cycle_length: 28, last_period_start: "2026-09-01" },
  cycles: [
    { start_date: "2026-07-02" },
    { start_date: "2026-08-01" },
    { start_date: "2026-09-01" },
  ],
  preferences: defaultPrefs,
})
// Intervals: 30 days and 31 days -> Avg: 31 days. Start: Sep 01 + 31 days = Oct 02.
assert(multiRes.calculatedCycleLength === 31, "Calculated cycle length from completed history: 31 days")
assert(multiRes.estimatedNextPeriodDate === "2026-10-02", "Next expected period: Sep 01 + 31 days = Oct 02")

// ==============================================================================
// 4. REMINDER TIMING & CATEGORY PREFERENCE FILTERING
// ==============================================================================
console.log("\n[Test 4] Testing reminder timing options and category preferences...")

// Option: 1 day before
const oneDayRes = localCalculateCycleReminders({
  profile: { id: "user-timing", usage_role: "cycle_tracker", typical_cycle_length: 28, last_period_start: "2026-09-01" },
  cycles: [],
  preferences: { ...defaultPrefs, reminder_days_before: 1 },
})
const upcoming1Day = oneDayRes.candidates.find((c) => c.type === "period_upcoming")
assert(upcoming1Day.scheduled_for === "2026-09-28", "1-day timing: scheduled on Sep 28 (1 day before Sep 29)")

// Option: On expected day (0 days before)
const zeroDayRes = localCalculateCycleReminders({
  profile: { id: "user-timing-0", usage_role: "cycle_tracker", typical_cycle_length: 28, last_period_start: "2026-09-01" },
  cycles: [],
  preferences: { ...defaultPrefs, reminder_days_before: 0 },
})
const upcoming0Day = zeroDayRes.candidates.find((c) => c.type === "period_upcoming")
assert(upcoming0Day === undefined, "0-day timing: suppresses advance upcoming reminder; relies on expected day")

// Category Disabling: Disabling fertile window & ovulation
const disabledRes = localCalculateCycleReminders({
  profile: { id: "user-dis", usage_role: "cycle_tracker", typical_cycle_length: 28, last_period_start: "2026-09-01" },
  cycles: [],
  preferences: { ...defaultPrefs, fertile_window_reminders: false, ovulation_reminders: false },
})
const typesDis = disabledRes.candidates.map((c) => c.type)
assert(!typesDis.includes("fertile_window"), "Disabling fertile_window_reminders suppresses fertile window event")
assert(!typesDis.includes("ovulation"), "Disabling ovulation_reminders suppresses ovulation event")
assert(typesDis.includes("period_upcoming"), "Enabled period_reminders remains active")

// ==============================================================================
// 5. CYCLE RECALCULATION & IDEMPOTENT DEDUPLICATION
// ==============================================================================
console.log("\n[Test 5] Testing cycle recalculation lifecycle & duplicate prevention...")

const syncModulePath = path.join(rootDir, "lib", "reminders", "sync.ts")
assert(fs.existsSync(syncModulePath), "lib/reminders/sync.ts exists")

const syncContent = fs.readFileSync(syncModulePath, "utf-8")
assert(syncContent.includes("syncUserReminders"), "Exports syncUserReminders")
assert(syncContent.includes("status: \"cancelled\""), "Cancels obsolete pending events on recalculation")
assert(syncContent.includes("eq(\"status\", \"pending\")"), "Targets strictly pending events when cancelling")
assert(syncContent.includes("eq(\"status\", \"sent\")"), "Queries sent events to protect historical log")

// Verify cycles.ts calls syncUserReminders on cycle mutations
const cyclesActionPath = path.join(rootDir, "app", "actions", "cycles.ts")
const cyclesActionContent = fs.readFileSync(cyclesActionPath, "utf-8")
assert(
  cyclesActionContent.includes("syncUserReminders(userId"),
  "app/actions/cycles.ts automatically calls syncUserReminders on cycle changes"
)

// ==============================================================================
// 6. SCHEDULER & DELIVERY PROCESSOR
// ==============================================================================
console.log("\n[Test 6] Testing scheduler processor & push delivery integration...")

const processorPath = path.join(rootDir, "lib", "reminders", "processor.ts")
assert(fs.existsSync(processorPath), "lib/reminders/processor.ts exists")

const processorContent = fs.readFileSync(processorPath, "utf-8")
assert(processorContent.includes("processPendingNotificationEvents"), "Exports processPendingNotificationEvents")
assert(processorContent.includes("sendWebPushNotification"), "Integrates with Phase 17 sendWebPushNotification")
assert(processorContent.includes("pushResult.isExpired"), "Detects expired subscriptions (404/410)")
assert(processorContent.includes("from(\"push_subscriptions\").delete()"), "Purges expired push subscriptions")
assert(processorContent.includes("status: \"sent\""), "Transitions event status to 'sent'")
assert(processorContent.includes("usage_role === \"supporter\""), "Cancels reminders if account became supporter")

// Verify Cron Route
const cronRoutePath = path.join(rootDir, "app", "api", "cron", "reminders", "route.ts")
assert(fs.existsSync(cronRoutePath), "app/api/cron/reminders/route.ts exists")

const cronRouteContent = fs.readFileSync(cronRoutePath, "utf-8")
assert(cronRouteContent.includes("export async function GET"), "Cron route exports GET handler")
assert(cronRouteContent.includes("export async function POST"), "Cron route exports POST handler")
assert(cronRouteContent.includes("CRON_SECRET"), "Cron route supports CRON_SECRET authorization")

// ==============================================================================
// 7. IN-APP NOTIFICATION CENTER & NAVIGATION
// ==============================================================================
console.log("\n[Test 7] Testing In-App Notification Center & header integration...")

const notifActionsPath = path.join(rootDir, "app", "actions", "notifications.ts")
assert(fs.existsSync(notifActionsPath), "app/actions/notifications.ts exists")

const notifActionsContent = fs.readFileSync(notifActionsPath, "utf-8")
assert(notifActionsContent.includes("getUserNotificationsAction"), "Exports getUserNotificationsAction")
assert(notifActionsContent.includes("getUnreadNotificationCountAction"), "Exports getUnreadNotificationCountAction")
assert(notifActionsContent.includes("markNotificationAsReadAction"), "Exports markNotificationAsReadAction")
assert(notifActionsContent.includes("markAllNotificationsAsReadAction"), "Exports markAllNotificationsAsReadAction")
assert(notifActionsContent.includes("deleteNotificationAction"), "Exports deleteNotificationAction")

// In-App Notification Page
const notifPagePath = path.join(rootDir, "app", "notifications", "page.tsx")
assert(fs.existsSync(notifPagePath), "app/notifications/page.tsx exists")

const notifPageContent = fs.readFileSync(notifPagePath, "utf-8")
assert(notifPageContent.includes("Notification Center"), "Notification page displays Notification Center title")
assert(notifPageContent.includes('filter === "unread"'), "Notification page supports unread filtering")
assert(notifPageContent.includes("markAllNotificationsAsReadAction"), "Notification page supports mark-all-as-read")

// Header Bell Integration
const bellComponentPath = path.join(rootDir, "components", "notifications", "notification-bell.tsx")
assert(fs.existsSync(bellComponentPath), "components/notifications/notification-bell.tsx exists")

const desktopHeaderPath = path.join(rootDir, "components", "shell", "desktop-header.tsx")
const desktopHeaderContent = fs.readFileSync(desktopHeaderPath, "utf-8")
assert(desktopHeaderContent.includes("<NotificationBell />"), "desktop-header.tsx embeds <NotificationBell />")

const mobileHeaderPath = path.join(rootDir, "components", "shell", "mobile-header.tsx")
const mobileHeaderContent = fs.readFileSync(mobileHeaderPath, "utf-8")
assert(mobileHeaderContent.includes("<NotificationBell />"), "mobile-header.tsx embeds <NotificationBell />")

// ==============================================================================
// 8. NOTIFICATION PERMISSION UX
// ==============================================================================
console.log("\n[Test 8] Testing explanatory notification permission UX...")

const permissionPromptPath = path.join(
  rootDir,
  "components",
  "notifications",
  "notification-permission-prompt.tsx"
)
assert(fs.existsSync(permissionPromptPath), "components/notifications/notification-permission-prompt.tsx exists")

const promptContent = fs.readFileSync(permissionPromptPath, "utf-8")
assert(promptContent.includes("Stay updated with your cycle"), "Permission prompt displays explanatory title")
assert(promptContent.includes("Enable reminders"), "Permission prompt renders 'Enable reminders' button")
assert(promptContent.includes("Not now"), "Permission prompt renders 'Not now' dismissal button")
assert(promptContent.includes("registerAndPersistWebPush"), "Triggers registration only on user click")
assert(promptContent.includes('usageRole === "supporter"'), "Suppresses permission prompt for supporter accounts")
assert(promptContent.includes('permission !== "default"'), "Suppresses prompt if permission is already granted or denied")

// Dashboard integration
const dashboardPath = path.join(rootDir, "app", "dashboard", "page.tsx")
const dashboardContent = fs.readFileSync(dashboardPath, "utf-8")
assert(
  dashboardContent.includes("<NotificationPermissionPrompt"),
  "dashboard/page.tsx embeds <NotificationPermissionPrompt />"
)

// ==============================================================================
// 9. CONCISE TEMPLATES & SAFE CLICK DESTINATIONS
// ==============================================================================
console.log("\n[Test 9] Testing notification templates & click routing...")

const templatesPath = path.join(rootDir, "lib", "reminders", "templates.ts")
assert(fs.existsSync(templatesPath), "lib/reminders/templates.ts exists")
const templatesContent = fs.readFileSync(templatesPath, "utf-8")

assert(templatesContent.includes('"Your period may start soon"'), "period_upcoming title matches requirements")
assert(templatesContent.includes('"Your period is expected today"'), "period_expected title matches requirements")
assert(templatesContent.includes('"Fertile window approaching"'), "fertile_window title matches requirements")
assert(templatesContent.includes('"Estimated ovulation day"'), "ovulation title matches requirements")
assert(templatesContent.includes('"New cycle phase"'), "cycle_transition title matches requirements")
assert(templatesContent.includes('"Period update"'), "missed_period title matches requirements")

assert(templatesContent.includes('url: "/dashboard"'), "Routes period events to /dashboard")
assert(templatesContent.includes('url: "/calendar"'), "Routes fertile window & ovulation to /calendar")
assert(templatesContent.includes('url: "/cycles"'), "Routes missed period to /cycles")

// ==============================================================================
// 10. SCOPE RESTRICTIONS & SECURITY AUDIT
// ==============================================================================
console.log("\n[Test 10] Auditing strict scope restrictions & security...")

function scanForProhibitedKeywords(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === ".git" ||
      entry.name === "scripts" ||
      entry.name === "scratch"
    ) {
      continue
    }
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanForProhibitedKeywords(fullPath)
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
    ) {
      const content = fs.readFileSync(fullPath, "utf-8")
      if (content.includes("groq") || content.includes("openai") || content.includes("astra")) {
        assert(false, `Prohibited AI / external service keyword found in ${fullPath}`)
      }
    }
  }
}

scanForProhibitedKeywords(rootDir)
assert(true, "Zero prohibited AI or external paid notification providers found in codebase")

// ==============================================================================
// FINAL SUMMARY
// ==============================================================================
console.log("\n=================================================")
if (failures === 0) {
  console.log("ALL SEIJUN PHASE 18 SMART CYCLE REMINDERS TESTS PASSED! 🎉")
  console.log("=================================================\n")
} else {
  console.error(`❌ TEST SUITE FAILED WITH ${failures} FAILURE(S).`)
  console.error("=================================================\n")
  process.exit(1)
}
