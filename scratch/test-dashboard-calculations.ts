import {
  calculateCurrentCycleDay,
  getCurrentCycle,
  getCurrentCycleStatus,
  getLatestPeriod,
  calculateAverageCycleLength,
  calculateAveragePeriodDuration,
  calculateEstimatedNextPeriod,
  calculateCycleProgress,
  calculateInclusiveDays,
  calculateDaysBetween,
} from "../lib/calculations/cycle-calculations"
import type { CycleRecord } from "../app/actions/cycles"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`PASS: ${message}`)
}

console.log("=== Testing Cycle Calculations for Phase 8 ===")

// 1. Current Cycle Day
const day15 = calculateCurrentCycleDay("2026-09-01", "2026-09-15")
assert(day15 === 15, `Day calculation: 2026-09-01 to 2026-09-15 should be 15, got ${day15}`)

const day1 = calculateCurrentCycleDay("2026-09-15", "2026-09-15")
assert(day1 === 1, `Day calculation: same day should be 1, got ${day1}`)

const dayMin = calculateCurrentCycleDay("2026-09-20", "2026-09-15")
assert(dayMin === 1, `Day calculation: future start should clamp to >= 1, got ${dayMin}`)

// 2. Inclusive Days & Days Between
const inclusiveDays = calculateInclusiveDays("2026-09-01", "2026-09-05")
assert(inclusiveDays === 5, `Inclusive days 2026-09-01..2026-09-05 should be 5, got ${inclusiveDays}`)

const daysBetween = calculateDaysBetween("2026-09-01", "2026-09-29")
assert(daysBetween === 28, `Days between 2026-09-01..2026-09-29 should be 28, got ${daysBetween}`)

// 3. Current Cycle Detection
const mockCycles: CycleRecord[] = [
  {
    id: "c1",
    user_id: "u1",
    start_date: "2026-09-01",
    end_date: null,
    cycle_length: null,
    period_duration: null,
    notes: null,
    created_at: "",
    updated_at: "",
    period_days: [],
  },
]

const currentC = getCurrentCycle(mockCycles, "2026-09-15")
assert(currentC?.id === "c1", "Current cycle found for 2026-09-15")

// 4. Status: Newly onboarded user with 0 period days
const statusNew = getCurrentCycleStatus(currentC, "2026-09-15")
assert(
  statusNew.status === "No period logged yet" && !statusNew.isOnPeriod,
  `Newly onboarded with 0 period days should be 'No period logged yet', got '${statusNew.status}'`
)

// Status: On Period today
const mockCycleOnPeriod: CycleRecord = {
  ...mockCycles[0],
  period_days: [
    { id: "pd1", cycle_id: "c1", user_id: "u1", date: "2026-09-15", flow: "medium", created_at: "" },
  ],
}
const statusPeriod = getCurrentCycleStatus(mockCycleOnPeriod, "2026-09-15")
assert(
  statusPeriod.status === "Period" && statusPeriod.isOnPeriod,
  `Status on period today should be 'Period', got '${statusPeriod.status}'`
)

// 5. getLatestPeriod
// Zero period days should return null (no fabricated period from onboarding)
const latestNone = getLatestPeriod(mockCycles)
assert(latestNone === null, "getLatestPeriod with 0 period_days returns null")

// With logged period days
const mockWithPeriodDays: CycleRecord[] = [
  {
    id: "c1",
    user_id: "u1",
    start_date: "2026-09-01",
    end_date: "2026-09-05",
    period_duration: 5,
    cycle_length: null,
    notes: null,
    created_at: "",
    updated_at: "",
    period_days: [
      { id: "p1", cycle_id: "c1", user_id: "u1", date: "2026-09-01", flow: "heavy", created_at: "" },
      { id: "p2", cycle_id: "c1", user_id: "u1", date: "2026-09-02", flow: "medium", created_at: "" },
      { id: "p3", cycle_id: "c1", user_id: "u1", date: "2026-09-03", flow: "medium", created_at: "" },
      { id: "p4", cycle_id: "c1", user_id: "u1", date: "2026-09-04", flow: "light", created_at: "" },
      { id: "p5", cycle_id: "c1", user_id: "u1", date: "2026-09-05", flow: "light", created_at: "" },
    ],
  },
]
const latestP = getLatestPeriod(mockWithPeriodDays)
assert(
  latestP?.startDate === "2026-09-01" && latestP?.endDate === "2026-09-05" && latestP?.duration === 5,
  `getLatestPeriod correctly returns 2026-09-01 to 2026-09-05 (5 days)`
)

// 6. Average Cycle Length
// Single cycle has no completed consecutive intervals -> null
const avgSingle = calculateAverageCycleLength(mockCycles)
assert(avgSingle === null, "Single cycle should have null average cycle length")

// Two cycles: Sep 1 and Sep 29 -> 28 days
const mockTwoCycles: CycleRecord[] = [
  { ...mockCycles[0], start_date: "2026-09-01" },
  { ...mockCycles[0], id: "c2", start_date: "2026-09-29" },
]
const avgTwo = calculateAverageCycleLength(mockTwoCycles)
assert(avgTwo === 28, `Two cycles (Sep 1 and Sep 29) average cycle length should be 28, got ${avgTwo}`)

// Three cycles: Sep 1, Sep 29 (28d), Oct 29 (30d) -> avg 29
const mockThreeCycles: CycleRecord[] = [
  { ...mockCycles[0], start_date: "2026-09-01" },
  { ...mockCycles[0], id: "c2", start_date: "2026-09-29" },
  { ...mockCycles[0], id: "c3", start_date: "2026-10-29" },
]
const avgThree = calculateAverageCycleLength(mockThreeCycles)
assert(avgThree === 29, `Three cycles (28d, 30d) average should be 29, got ${avgThree}`)

// 7. Average Period Duration
const avgDurationNone = calculateAveragePeriodDuration(mockCycles)
assert(avgDurationNone === null, "Cycles with no completed period days should return null average duration")

const avgDurationOne = calculateAveragePeriodDuration(mockWithPeriodDays)
assert(avgDurationOne === 5, `Completed period of 5 days should have average duration 5, got ${avgDurationOne}`)

// 8. Estimated Next Period
// With historical data
const estimatedWithHistory = calculateEstimatedNextPeriod({
  latestCycleStartDate: "2026-09-01",
  averageCycleLength: 28,
  typicalCycleLength: 30,
  referenceDateStr: "2026-09-15",
})
assert(
  estimatedWithHistory?.estimatedStartDate === "2026-09-29" &&
    estimatedWithHistory?.isFallback === false &&
    estimatedWithHistory?.daysUntil === 14,
  `Estimated next period using historical average should be 2026-09-29, got ${estimatedWithHistory?.estimatedStartDate}`
)

// With fallback to typicalCycleLength
const estimatedWithFallback = calculateEstimatedNextPeriod({
  latestCycleStartDate: "2026-09-01",
  averageCycleLength: null,
  typicalCycleLength: 28,
  referenceDateStr: "2026-09-15",
})
assert(
  estimatedWithFallback?.estimatedStartDate === "2026-09-29" &&
    estimatedWithFallback?.isFallback === true,
  `Estimated next period using fallback typicalCycleLength should be 2026-09-29 with isFallback=true`
)

// 9. Cycle Progress
const progress = calculateCycleProgress({ currentCycleDay: 15, expectedCycleLength: 28 })
assert(
  progress.progressPercent === 54 && progress.day === 15 && progress.expectedTotalDays === 28,
  `Cycle progress day 15 of 28 should be 54%, got ${progress.progressPercent}%`
)

console.log("=== ALL UNIT TESTS PASSED SUCCESSFULLY ===")
