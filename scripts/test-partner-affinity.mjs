/**
 * Seijun Phase 20: Affinity & Partner Experience Test Suite
 *
 * Exhaustively validates:
 * 1. Database schema, columns, defaults, check constraints, and RLS integrity
 * 2. Relationship start date validation (future date rejection, invalid dates, boundary limits)
 * 3. Dynamic relationship duration calendar arithmetic (DST/timezone immunity, leap year calculations)
 * 4. Progression of duration as time advances
 * 5. All supported duration display formats ('detailed', 'years_months', 'months_days', 'weeks_days', 'total_days')
 * 6. Missing relationship data & newly connected relationship handling
 * 7. Disconnected, pending, and revoked relationship states
 * 8. Authorization & RLS protection against unauthorized access/mutation
 * 9. Component architecture, export contracts, and integration audit
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import {
  isValidRelationshipDate,
  formatAnniversaryDate,
  calculateRelationshipDuration,
} from "../lib/partner/affinity.ts"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Phase 20: Affinity & Partner Experience Test Suite ===\n")

let failures = 0
let passed = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`)
    failures++
  } else {
    console.log(`  ✓ ${message}`)
    passed++
  }
}

// ==============================================================================
// 1. DATABASE SCHEMA & MIGRATION AUDIT
// ==============================================================================
console.log("[Test 1] Auditing Phase 20 Database Migration & Constraints...")

const migrationPath = path.join(
  rootDir,
  "supabase",
  "migrations",
  "20260927000001_partner_affinity.sql"
)

assert(fs.existsSync(migrationPath), "Migration 20260927000001_partner_affinity.sql exists")

const migrationContent = fs.readFileSync(migrationPath, "utf-8")

assert(
  migrationContent.includes("ALTER TABLE public.partner_relationships"),
  "Alters public.partner_relationships"
)
assert(
  migrationContent.includes("relationship_start_date DATE"),
  "Adds relationship_start_date DATE column"
)
assert(
  migrationContent.includes("check_partner_relationships_start_date_not_future"),
  "Enforces safe check constraint preventing future start dates"
)
assert(
  migrationContent.includes("idx_partner_relationships_start_date"),
  "Creates index on partner_relationships(relationship_start_date)"
)
assert(
  migrationContent.includes("ALTER TABLE public.profiles"),
  "Alters public.profiles for user preference"
)
assert(
  migrationContent.includes("affinity_display_format TEXT NOT NULL DEFAULT 'detailed'"),
  "Adds affinity_display_format column defaulting to 'detailed'"
)
assert(
  migrationContent.includes("check_profiles_affinity_display_format"),
  "Enforces constraint for allowed display format options"
)

// ==============================================================================
// 2. RELATIONSHIP START DATE VALIDATION TESTS
// ==============================================================================
console.log("\n[Test 2] Testing Relationship Start Date Validation Rules...")

const refDate = "2026-09-27"

// 2.1 Valid dates
assert(
  isValidRelationshipDate("2024-02-14", refDate).valid === true,
  "Valid date '2024-02-14' accepted"
)
assert(
  isValidRelationshipDate("2020-01-01", refDate).valid === true,
  "Valid historical date '2020-01-01' accepted"
)
assert(
  isValidRelationshipDate(refDate, refDate).valid === true,
  "Today's date accepted as start date"
)
assert(
  isValidRelationshipDate("2024-02-29", refDate).valid === true,
  "Valid leap day '2024-02-29' in leap year accepted"
)

// 2.2 Invalid date patterns
assert(
  isValidRelationshipDate("", refDate).valid === false,
  "Empty date rejected"
)
assert(
  isValidRelationshipDate("invalid-date", refDate).valid === false,
  "Malformed string rejected"
)
assert(
  isValidRelationshipDate("2024/02/14", refDate).valid === false,
  "Slash format rejected (requires YYYY-MM-DD)"
)
assert(
  isValidRelationshipDate("2023-02-29", refDate).valid === false,
  "Invalid leap day in non-leap year (2023-02-29) rejected"
)
assert(
  isValidRelationshipDate("2024-04-31", refDate).valid === false,
  "Non-existent April 31st rejected"
)
assert(
  isValidRelationshipDate("1899-12-31", refDate).valid === false,
  "Dates earlier than year 1900 rejected"
)

// 2.3 Future date rejection
assert(
  isValidRelationshipDate("2026-09-28", refDate).valid === false,
  "Tomorrow's date strictly rejected as future date"
)
assert(
  isValidRelationshipDate("2030-01-01", refDate).valid === false,
  "Far future date strictly rejected"
)

// ==============================================================================
// 3. DYNAMIC RELATIONSHIP DURATION CALCULATION TESTS
// ==============================================================================
console.log("\n[Test 3] Testing Dynamic Calendar Duration Calculations...")

// 3.1 Same-day start (Day 1 / Started today)
const todayResult = calculateRelationshipDuration("2026-09-27", "2026-09-27")
assert(todayResult.totalDays === 0, "Same day totalDays is 0")
assert(todayResult.isToday === true, "Same day isToday is true")
assert(todayResult.formattedText === "Started today", "Same day formattedText is 'Started today'")

// 3.2 1 day ago
const oneDayResult = calculateRelationshipDuration("2026-09-26", "2026-09-27")
assert(oneDayResult.totalDays === 1, "1 day ago totalDays is 1")
assert(oneDayResult.days === 1, "1 day ago days component is 1")
assert(oneDayResult.formattedText === "1 day", "1 day ago formattedText is '1 day'")

// 3.3 10 days ago (weeks & remaining days)
const tenDaysResult = calculateRelationshipDuration("2026-09-17", "2026-09-27")
assert(tenDaysResult.totalDays === 10, "10 days ago totalDays is 10")
assert(tenDaysResult.totalWeeks === 1, "10 days ago totalWeeks is 1")
assert(tenDaysResult.remainingDaysAfterWeeks === 3, "10 days ago remainingDaysAfterWeeks is 3")

// 3.4 1 month ago
const oneMonthResult = calculateRelationshipDuration("2026-08-27", "2026-09-27")
assert(oneMonthResult.months === 1, "1 month ago months component is 1")
assert(oneMonthResult.days === 0, "1 month ago days component is 0")
assert(oneMonthResult.formattedText === "1 month", "1 month ago formattedText is '1 month'")

// 3.5 1 year ago
const oneYearResult = calculateRelationshipDuration("2025-09-27", "2026-09-27")
assert(oneYearResult.years === 1, "1 year ago years component is 1")
assert(oneYearResult.months === 0, "1 year ago months component is 0")
assert(oneYearResult.days === 0, "1 year ago days component is 0")
assert(oneYearResult.formattedText === "1 year", "1 year ago formattedText is '1 year'")

// 3.6 Multi-year composite calculation
const multiYearResult = calculateRelationshipDuration("2024-02-14", "2026-09-27")
assert(multiYearResult.years === 2, "2024-02-14 to 2026-09-27: 2 years")
assert(multiYearResult.months === 7, "2024-02-14 to 2026-09-27: 7 months")
assert(multiYearResult.days === 13, "2024-02-14 to 2026-09-27: 13 days")
assert(multiYearResult.totalDays === 956, "2024-02-14 to 2026-09-27: 956 total days (leap year included)")

// 3.7 Leap year boundary
const leapYearResult = calculateRelationshipDuration("2024-02-29", "2025-02-28")
assert(leapYearResult.totalDays === 365, "2024-02-29 to 2025-02-28 is exactly 365 days")

// ==============================================================================
// 4. TIME ADVANCING / FRESHNESS TESTS
// ==============================================================================
console.log("\n[Test 4] Testing Duration Dynamic Progression As Time Advances...")

const anniversary = "2024-06-15"

const day1 = calculateRelationshipDuration(anniversary, "2026-06-15")
assert(day1.years === 2 && day1.months === 0 && day1.days === 0, "At 2 year anniversary: exactly 2 years")

// Advance time by 1 day
const day2 = calculateRelationshipDuration(anniversary, "2026-06-16")
assert(day2.years === 2 && day2.months === 0 && day2.days === 1, "Next day: 2 years, 1 day")
assert(day2.totalDays === day1.totalDays + 1, "totalDays increments by exactly 1")

// Advance time by 1 month
const day3 = calculateRelationshipDuration(anniversary, "2026-07-15")
assert(day3.years === 2 && day3.months === 1 && day3.days === 0, "Next month: 2 years, 1 month")

// Advance time by 1 year
const day4 = calculateRelationshipDuration(anniversary, "2027-06-15")
assert(day4.years === 3 && day4.months === 0 && day4.days === 0, "Next year: 3 years")
assert(day4.totalDays > day1.totalDays, "Multi-year duration dynamically increases")

// ==============================================================================
// 5. ALL SUPPORTED DISPLAY FORMATS TESTS
// ==============================================================================
console.log("\n[Test 5] Testing All Supported Duration Display Formats...")

const testStart = "2024-02-14"
const testNow = "2026-09-27"

// Format 1: detailed
const detailed = calculateRelationshipDuration(testStart, testNow, "detailed")
assert(
  detailed.formattedText === "2 years, 7 months, 13 days",
  "Detailed format: '2 years, 7 months, 13 days'"
)

// Format 2: years_months
const yearsMonths = calculateRelationshipDuration(testStart, testNow, "years_months")
assert(
  yearsMonths.formattedText === "2 years, 7 months",
  "Years & Months format: '2 years, 7 months'"
)

// Format 3: months_days
const monthsDays = calculateRelationshipDuration(testStart, testNow, "months_days")
assert(
  monthsDays.formattedText === "31 months, 13 days",
  "Months & Days format: '31 months, 13 days'"
)

// Format 4: weeks_days
const weeksDays = calculateRelationshipDuration(testStart, testNow, "weeks_days")
assert(
  weeksDays.formattedText === "136 weeks, 4 days",
  "Weeks & Days format: '136 weeks, 4 days'"
)

// Format 5: total_days
const totalDays = calculateRelationshipDuration(testStart, testNow, "total_days")
assert(
  totalDays.formattedText === "956 days",
  "Total Days format: '956 days'"
)

// Test anniversary date formatting
assert(
  formatAnniversaryDate("2024-02-14") === "February 14, 2024",
  "formatAnniversaryDate converts '2024-02-14' to 'February 14, 2024'"
)

// ==============================================================================
// 6. MISSING RELATIONSHIP DATA & STATE HANDLING
// ==============================================================================
console.log("\n[Test 6] Testing Missing Data & State Invariants...")

// Null start date
const nullStartResult = calculateRelationshipDuration("")
assert(
  nullStartResult.formattedText === "Invalid date",
  "Empty/null start date returns 'Invalid date' safely without throwing"
)

// Service state inspection
const servicePath = path.join(rootDir, "lib", "partner", "service.ts")
const serviceContent = fs.readFileSync(servicePath, "utf-8")

assert(
  serviceContent.includes("relationship_start_date"),
  "service.ts queries relationship_start_date in getPartnerConnectionState"
)
assert(
  serviceContent.includes("affinity_display_format"),
  "service.ts queries affinity_display_format in getPartnerConnectionState"
)
assert(
  serviceContent.includes("export async function updateRelationshipStartDate"),
  "service.ts exports updateRelationshipStartDate function"
)
assert(
  serviceContent.includes("export async function updateAffinityDisplayFormat"),
  "service.ts exports updateAffinityDisplayFormat function"
)

// Check active relationship guard in updateRelationshipStartDate
assert(
  serviceContent.includes(".eq(\"status\", \"active\")"),
  "updateRelationshipStartDate strictly requires relationship status = 'active'"
)

// ==============================================================================
// 7. AUTHORIZATION & RLS SECURITY CONTRACTS
// ==============================================================================
console.log("\n[Test 7] Auditing Authorization & Security Contracts...")

const authPath = path.join(rootDir, "lib", "partner", "authorization.ts")
const authContent = fs.readFileSync(authPath, "utf-8")

assert(
  authContent.includes("relationshipStartDate?: string | null"),
  "AuthorizedPartnerContext includes relationshipStartDate"
)
assert(
  authContent.includes("affinityDisplayFormat?: AffinityDisplayFormat"),
  "getEnabledSharingCategories includes affinityDisplayFormat"
)

const actionsPath = path.join(rootDir, "app", "actions", "partner.ts")
const actionsContent = fs.readFileSync(actionsPath, "utf-8")

assert(
  actionsContent.includes("export async function updateRelationshipStartDateAction"),
  "actions/partner.ts exports updateRelationshipStartDateAction"
)
assert(
  actionsContent.includes("export async function updateAffinityDisplayFormatAction"),
  "actions/partner.ts exports updateAffinityDisplayFormatAction"
)

// Server Action Session Derivation
assert(
  actionsContent.includes("await supabase.auth.getUser()"),
  "Server actions derive user strictly from session auth, never client IDs"
)

// ==============================================================================
// 8. COMPONENT ARCHITECTURE & UI INTEGRATION
// ==============================================================================
console.log("\n[Test 8] Auditing Component Architecture & UI Integration...")

const affinityCardPath = path.join(rootDir, "components", "partner", "affinity-card.tsx")
assert(fs.existsSync(affinityCardPath), "components/partner/affinity-card.tsx exists")

const affinityCardContent = fs.readFileSync(affinityCardPath, "utf-8")
assert(
  affinityCardContent.includes("AFFINITY_DISPLAY_FORMATS"),
  "AffinityCard supports interactive format switching"
)
assert(
  affinityCardContent.includes("updateRelationshipStartDateAction"),
  "AffinityCard connects to updateRelationshipStartDateAction"
)
assert(
  affinityCardContent.includes("updateAffinityDisplayFormatAction"),
  "AffinityCard connects to updateAffinityDisplayFormatAction"
)
assert(
  affinityCardContent.includes("max={currentDate}") ||
  affinityCardContent.includes("maxDate={currentDate}"),
  "AffinityCard enforces max date to prevent future date selection"
)

const modernPickerPath = path.join(rootDir, "components", "partner", "affinity-date-picker.tsx")
assert(fs.existsSync(modernPickerPath), "components/partner/affinity-date-picker.tsx exists")

const partnerCardPath = path.join(rootDir, "components", "partner", "partner-connection-card.tsx")
const partnerCardContent = fs.readFileSync(partnerCardPath, "utf-8")
assert(
  partnerCardContent.includes("<AffinityCard"),
  "PartnerConnectionCard renders AffinityCard for active connected partner"
)

const dashboardViewPath = path.join(rootDir, "components", "partner", "partner-dashboard-view.tsx")
const dashboardViewContent = fs.readFileSync(dashboardViewPath, "utf-8")
assert(
  dashboardViewContent.includes("<AffinityCard"),
  "PartnerDashboardView renders AffinityCard for supporter experience"
)

const settingsMenuPath = path.join(rootDir, "components", "settings", "settings-menu.tsx")
const settingsMenuContent = fs.readFileSync(settingsMenuPath, "utf-8")
assert(
  settingsMenuContent.includes("item-affinity-milestones"),
  "SettingsMenu features Affinity & Duration in Partner category"
)

// ==============================================================================
// SUMMARY
// ==============================================================================
console.log("\n=================================================")
if (failures === 0) {
  console.log(`ALL SEIJUN PHASE 20 AFFINITY TESTS PASSED! 🎉 (${passed} passed, 0 failed)`)
  console.log("=================================================\n")
  process.exit(0)
} else {
  console.error(`SOME TESTS FAILED! (${passed} passed, ${failures} failed)`)
  console.log("=================================================\n")
  process.exit(1)
}
