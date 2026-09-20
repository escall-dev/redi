import {
  calculateCycleDayForDate,
  getCycleForDate,
  getPeriodDayForDate,
  getCalendarGrid,
  getSelectedDateContext,
  extractAllPeriodDays,
  getMonthName,
} from "../lib/calculations/calendar-calculations"
import type { CycleRecord, PeriodDayRecord } from "../app/actions/cycles"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`PASS: ${message}`)
}

console.log("=== Running Redi Phase 9 — Calendar Verification Tests ===")

// -------------------------------------------------------------
// Scenario 1: Newly onboarded user (Cycle starts Sept 1, 0 period days)
// -------------------------------------------------------------
console.log("\n--- Scenario 1: Newly Onboarded User ---")
const onboardedCycle: CycleRecord = {
  id: "cycle-onboarding-1",
  user_id: "user-1",
  start_date: "2026-09-01",
  end_date: null,
  cycle_length: null,
  period_duration: null,
  notes: "Initial cycle from Seijun onboarding.",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  period_days: [],
  period_days_count: 0,
}

const s1Grid = getCalendarGrid({
  year: 2026,
  month: 8, // September (0-indexed)
  cycles: [onboardedCycle],
  todayStr: "2026-09-15",
})

const sept1Cell = s1Grid.find((c) => c.dateStr === "2026-09-01")
assert(Boolean(sept1Cell), "September 1 cell exists in grid")
assert(sept1Cell?.periodDay === null, "September 1 has NO period day record")
assert(sept1Cell?.cycle?.id === "cycle-onboarding-1", "September 1 maps to initial cycle")
assert(sept1Cell?.cycleDay === 1, "September 1 has cycle day 1")

const s1Context = getSelectedDateContext({
  selectedDateStr: "2026-09-01",
  cycles: [onboardedCycle],
  todayStr: "2026-09-15",
})
assert(!s1Context.isPeriodDay, "Selected context: isPeriodDay is false")
assert(s1Context.flow === null, "Selected context: flow is null (no fabricated flow)")
assert(s1Context.cycleDay === 1, "Selected context: cycleDay is 1")
assert(s1Context.isTrackingStartDay, "Selected context: isTrackingStartDay is true")
assert(s1Context.statusMessage.includes("tracking starts here"), `Expected 'tracking starts here', got: ${s1Context.statusMessage}`)

// -------------------------------------------------------------
// Scenario 2: Explicit period (September 1–5)
// -------------------------------------------------------------
console.log("\n--- Scenario 2: Explicit Period (Sept 1–5) ---")
const explicitPeriodDays: PeriodDayRecord[] = [
  { id: "pd-1", cycle_id: "cycle-2", user_id: "user-1", date: "2026-09-01", flow: "medium", created_at: "" },
  { id: "pd-2", cycle_id: "cycle-2", user_id: "user-1", date: "2026-09-02", flow: "heavy", created_at: "" },
  { id: "pd-3", cycle_id: "cycle-2", user_id: "user-1", date: "2026-09-03", flow: "medium", created_at: "" },
  { id: "pd-4", cycle_id: "cycle-2", user_id: "user-1", date: "2026-09-04", flow: "light", created_at: "" },
  { id: "pd-5", cycle_id: "cycle-2", user_id: "user-1", date: "2026-09-05", flow: "light", created_at: "" },
]

const cycleWithPeriod: CycleRecord = {
  id: "cycle-2",
  user_id: "user-1",
  start_date: "2026-09-01",
  end_date: "2026-09-05",
  cycle_length: null,
  period_duration: 5,
  notes: null,
  created_at: "",
  updated_at: "",
  period_days: explicitPeriodDays,
  period_days_count: 5,
}

const s2Grid = getCalendarGrid({
  year: 2026,
  month: 8,
  cycles: [cycleWithPeriod],
  todayStr: "2026-09-15",
})

for (let d = 1; d <= 5; d++) {
  const dateStr = `2026-09-0${d}`
  const cell = s2Grid.find((c) => c.dateStr === dateStr)
  assert(Boolean(cell?.periodDay), `${dateStr} has periodDay marker`)
  assert(cell?.cycleDay === d, `${dateStr} cycleDay is ${d}`)
}
const extracted = extractAllPeriodDays([cycleWithPeriod])
assert(extracted.length === 5, `extractAllPeriodDays returns 5 period days, got ${extracted.length}`)
const foundDay = getPeriodDayForDate(extracted, "2026-09-02")
assert(foundDay?.flow === "heavy", "getPeriodDayForDate finds 2026-09-02 with heavy flow")
const notFoundDay = getPeriodDayForDate(extracted, "2026-09-20")
assert(notFoundDay === null, "getPeriodDayForDate returns null for unlogged date")

// -------------------------------------------------------------
// Scenario 3: Different flow values (light, medium, heavy)
// -------------------------------------------------------------
console.log("\n--- Scenario 3: Flow Values (light, medium, heavy) ---")
const s3Days: PeriodDayRecord[] = [
  { id: "p-l", cycle_id: "c-3", user_id: "u1", date: "2026-09-01", flow: "light", created_at: "" },
  { id: "p-m", cycle_id: "c-3", user_id: "u1", date: "2026-09-02", flow: "medium", created_at: "" },
  { id: "p-h", cycle_id: "c-3", user_id: "u1", date: "2026-09-03", flow: "heavy", created_at: "" },
]
const c3: CycleRecord = {
  id: "c-3",
  user_id: "u1",
  start_date: "2026-09-01",
  end_date: "2026-09-03",
  cycle_length: null,
  period_duration: 3,
  notes: null,
  created_at: "",
  updated_at: "",
  period_days: s3Days,
}

const ctxLight = getSelectedDateContext({ selectedDateStr: "2026-09-01", cycles: [c3], todayStr: "2026-09-15" })
assert(ctxLight.flow === "light", "September 1 flow is light")

const ctxMedium = getSelectedDateContext({ selectedDateStr: "2026-09-02", cycles: [c3], todayStr: "2026-09-15" })
assert(ctxMedium.flow === "medium", "September 2 flow is medium")

const ctxHeavy = getSelectedDateContext({ selectedDateStr: "2026-09-03", cycles: [c3], todayStr: "2026-09-15" })
assert(ctxHeavy.flow === "heavy", "September 3 flow is heavy")

// -------------------------------------------------------------
// Scenario 4: Completed cycle + current cycle
// -------------------------------------------------------------
console.log("\n--- Scenario 4: Completed Cycle + Current Cycle ---")
const cycle1: CycleRecord = {
  id: "cycle-aug",
  user_id: "u1",
  start_date: "2026-08-01",
  end_date: "2026-08-05",
  cycle_length: 28,
  period_duration: 5,
  notes: null,
  created_at: "",
  updated_at: "",
  period_days: [
    { id: "p-aug-1", cycle_id: "cycle-aug", user_id: "u1", date: "2026-08-01", flow: "medium", created_at: "" },
  ],
}
const cycle2: CycleRecord = {
  id: "cycle-sep",
  user_id: "u1",
  start_date: "2026-08-29",
  end_date: null,
  cycle_length: null,
  period_duration: null,
  notes: null,
  created_at: "",
  updated_at: "",
  period_days: [
    { id: "p-sep-1", cycle_id: "cycle-sep", user_id: "u1", date: "2026-08-29", flow: "heavy", created_at: "" },
  ],
}
const twoCycles = [cycle1, cycle2]

const aug10Cycle = getCycleForDate(twoCycles, "2026-08-10", "2026-09-15")
assert(aug10Cycle?.id === "cycle-aug", "2026-08-10 maps to August cycle")
assert(calculateCycleDayForDate(aug10Cycle!.start_date, "2026-08-10") === 10, "2026-08-10 is Cycle Day 10")

const aug28Cycle = getCycleForDate(twoCycles, "2026-08-28", "2026-09-15")
assert(aug28Cycle?.id === "cycle-aug", "2026-08-28 (day before cycle 2) maps to August cycle")
assert(calculateCycleDayForDate(aug28Cycle!.start_date, "2026-08-28") === 28, "2026-08-28 is Cycle Day 28")

const aug29Cycle = getCycleForDate(twoCycles, "2026-08-29", "2026-09-15")
assert(aug29Cycle?.id === "cycle-sep", "2026-08-29 maps to September cycle")
assert(calculateCycleDayForDate(aug29Cycle!.start_date, "2026-08-29") === 1, "2026-08-29 is Cycle Day 1")

const sep15Cycle = getCycleForDate(twoCycles, "2026-09-15", "2026-09-15")
assert(sep15Cycle?.id === "cycle-sep", "2026-09-15 maps to September cycle")
assert(calculateCycleDayForDate(sep15Cycle!.start_date, "2026-09-15") === 18, "2026-09-15 is Cycle Day 18")

// -------------------------------------------------------------
// Scenario 5: Selected date information matches actual database record
// -------------------------------------------------------------
console.log("\n--- Scenario 5: Selected Date Matches Record ---")
const ctxAug1 = getSelectedDateContext({ selectedDateStr: "2026-08-01", cycles: twoCycles, todayStr: "2026-09-15" })
assert(ctxAug1.isPeriodDay, "2026-08-01 is a period day")
assert(ctxAug1.flow === "medium", "2026-08-01 flow matches record (medium)")
assert(ctxAug1.cycle?.id === "cycle-aug", "2026-08-01 cycle matches cycle-aug")
assert(ctxAug1.cycleDay === 1, "2026-08-01 cycle day is 1")

// -------------------------------------------------------------
// Scenario 6: Month navigation & boundary dates
// -------------------------------------------------------------
console.log("\n--- Scenario 6: Month Navigation & Boundary Isolation ---")
// September 2026 starts on Tuesday (firstDayOfWeek = 2)
// Leading cells must be from August: Aug 30, Aug 31
const sepGrid = getCalendarGrid({ year: 2026, month: 8, cycles: twoCycles, todayStr: "2026-09-15" })
const leading1 = sepGrid[0]
const leading2 = sepGrid[1]
assert(leading1.dateStr === "2026-08-30", `Leading day 1 date is 2026-08-30, got ${leading1.dateStr}`)
assert(!leading1.isCurrentMonth, "Leading day 1 is marked isCurrentMonth=false")
assert(leading2.dateStr === "2026-08-31", `Leading day 2 date is 2026-08-31, got ${leading2.dateStr}`)
assert(!leading2.isCurrentMonth, "Leading day 2 is marked isCurrentMonth=false")

// August 29 period day should NOT leak onto September 29!
const sep29Cell = sepGrid.find((c) => c.dateStr === "2026-09-29")
assert(sep29Cell?.periodDay === null, "September 29 does not have August 29 period record (no leakage)")

// -------------------------------------------------------------
// Scenario 7: Cycle navigation (/cycles/[id])
// -------------------------------------------------------------
console.log("\n--- Scenario 7: Cycle Navigation Target ---")
assert(ctxAug1.cycle?.id === "cycle-aug", "Selected date has cycleId for /cycles/cycle-aug")
assert(sep15Cycle?.id === "cycle-sep", "Sep 15 has cycleId for /cycles/cycle-sep")

// -------------------------------------------------------------
// Scenario 8: Future date (no fabricated period or cycle information)
// -------------------------------------------------------------
console.log("\n--- Scenario 8: Future Date Handling ---")
const futureDate = "2026-09-25"
const ctxFuture = getSelectedDateContext({ selectedDateStr: futureDate, cycles: twoCycles, todayStr: "2026-09-15" })
assert(ctxFuture.isFuture, "2026-09-25 is marked isFuture=true")
assert(ctxFuture.isPeriodDay === false, "2026-09-25 periodDay is false (no fabrication)")
assert(ctxFuture.cycle === null, "2026-09-25 cycle is null (no fabricated cycle)")
assert(ctxFuture.cycleDay === null, "2026-09-25 cycleDay is null")
assert(ctxFuture.statusMessage.includes("Future date"), "Status indicates future date with no tracked data")

// Date before history:
const pastDate = "2026-07-15"
const ctxPast = getSelectedDateContext({ selectedDateStr: pastDate, cycles: twoCycles, todayStr: "2026-09-15" })
assert(ctxPast.isBeforeHistory, "2026-07-15 is marked isBeforeHistory=true")
assert(ctxPast.cycle === null, "2026-07-15 cycle is null")
assert(ctxPast.statusMessage.includes("No tracked cycle data"), "Status indicates no tracked cycle data")

// -------------------------------------------------------------
// Scenario 9: Small Mobile Viewport Readiness & Month Names
// -------------------------------------------------------------
console.log("\n--- Scenario 9: Viewport Readiness & Month Names ---")
assert(getMonthName(0) === "January", "Month 0 is January")
assert(getMonthName(8) === "September", "Month 8 is September")
assert(sepGrid.length % 7 === 0, `Grid has complete weekly rows (multiple of 7): ${sepGrid.length}`)

console.log("\n>>> ALL 9 CALENDAR CALCULATION SCENARIOS PASSED SUCCESSFULLY! <<<")
