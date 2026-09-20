import {
  getCurrentCycle,
  calculateCurrentCycleDay,
  getCurrentCycleStatus,
  getLatestPeriod,
  calculateAverageCycleLength,
  calculateAveragePeriodDuration,
  calculateEstimatedNextPeriod,
  calculateCycleProgress,
} from "../lib/calculations/cycle-calculations"
import type { CycleRecord } from "../app/actions/cycles"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`PASS: ${message}`)
}

console.log("=== Testing Comprehensive Dashboard Scenarios ===")

// Reference date for tests
const REF_DATE = "2026-09-15"

// Scenario 1: Newly onboarded user (One cycle, zero period days)
console.log("\n--- Scenario 1: Newly onboarded user ---")
const newlyOnboardedCycles: CycleRecord[] = [
  {
    id: "c-init",
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
  },
]

const s1_current = getCurrentCycle(newlyOnboardedCycles, REF_DATE)
assert(s1_current?.id === "c-init", "S1: Current cycle found")
const s1_status = getCurrentCycleStatus(s1_current, REF_DATE)
assert(s1_status.status === "No period logged yet", `S1: Status is 'No period logged yet', got '${s1_status.status}'`)
assert(!s1_status.isOnPeriod, "S1: Not on period")
const s1_latestPeriod = getLatestPeriod(newlyOnboardedCycles)
assert(s1_latestPeriod === null, "S1: Latest period is null (no fabricated period data)")
const s1_avgCycle = calculateAverageCycleLength(newlyOnboardedCycles)
assert(s1_avgCycle === null, "S1: Avg cycle length is null (insufficient data)")
const s1_avgPeriod = calculateAveragePeriodDuration(newlyOnboardedCycles)
assert(s1_avgPeriod === null, "S1: Avg period duration is null (no completed period)")
const s1_estNext = calculateEstimatedNextPeriod({
  latestCycleStartDate: s1_current?.start_date ?? null,
  averageCycleLength: s1_avgCycle,
  typicalCycleLength: 28,
  referenceDateStr: REF_DATE,
})
assert(s1_estNext?.estimatedStartDate === "2026-09-29", `S1: Estimated next period is 2026-09-29`)
assert(s1_estNext?.isFallback === true, "S1: Estimated next period uses fallback typical cycle length")

// Scenario 2: One explicitly logged period (missing period end / ongoing)
console.log("\n--- Scenario 2: Missing period end / Ongoing period ---")
const ongoingPeriodCycles: CycleRecord[] = [
  {
    id: "c-ongoing",
    user_id: "user-1",
    start_date: "2026-09-12",
    end_date: null,
    cycle_length: null,
    period_duration: null,
    notes: null,
    created_at: "2026-09-12T00:00:00Z",
    updated_at: "2026-09-15T00:00:00Z",
    period_days: [
      { id: "p1", cycle_id: "c-ongoing", user_id: "user-1", date: "2026-09-12", flow: "heavy", created_at: "" },
      { id: "p2", cycle_id: "c-ongoing", user_id: "user-1", date: "2026-09-13", flow: "heavy", created_at: "" },
      { id: "p3", cycle_id: "c-ongoing", user_id: "user-1", date: "2026-09-14", flow: "medium", created_at: "" },
      { id: "p4", cycle_id: "c-ongoing", user_id: "user-1", date: "2026-09-15", flow: "light", created_at: "" },
    ],
    period_days_count: 4,
  },
]

const s2_current = getCurrentCycle(ongoingPeriodCycles, REF_DATE)
const s2_status = getCurrentCycleStatus(s2_current, REF_DATE)
assert(s2_status.status === "Period", `S2: User is currently on period on 2026-09-15, got '${s2_status.status}'`)
assert(s2_status.isOnPeriod === true, "S2: isOnPeriod is true")
const s2_latestPeriod = getLatestPeriod(ongoingPeriodCycles)
assert(s2_latestPeriod !== null, "S2: Latest period identified")
assert(s2_latestPeriod?.isOngoing === true, "S2: Period is ongoing (end_date null)")
assert(s2_latestPeriod?.duration === 4, `S2: Period duration is 4 days, got ${s2_latestPeriod?.duration}`)
const s2_avgPeriod = calculateAveragePeriodDuration(ongoingPeriodCycles)
assert(s2_avgPeriod === null, "S2: Ongoing period does not distort average period duration")

// Scenario 3: Multiple cycles (Completed cycle + Current cycle) with different flow values
console.log("\n--- Scenario 3: Completed cycle + Current cycle ---")
const multiCycles: CycleRecord[] = [
  // Current cycle: started Sep 29, period completed Sep 29-Oct 3 (5 days)
  {
    id: "c-curr",
    user_id: "user-1",
    start_date: "2026-09-29",
    end_date: "2026-10-03",
    cycle_length: null,
    period_duration: 5,
    notes: null,
    created_at: "",
    updated_at: "",
    period_days: [
      { id: "d1", cycle_id: "c-curr", user_id: "user-1", date: "2026-09-29", flow: "heavy", created_at: "" },
      { id: "d2", cycle_id: "c-curr", user_id: "user-1", date: "2026-09-30", flow: "heavy", created_at: "" },
      { id: "d3", cycle_id: "c-curr", user_id: "user-1", date: "2026-10-01", flow: "medium", created_at: "" },
      { id: "d4", cycle_id: "c-curr", user_id: "user-1", date: "2026-10-02", flow: "medium", created_at: "" },
      { id: "d5", cycle_id: "c-curr", user_id: "user-1", date: "2026-10-03", flow: "light", created_at: "" },
    ],
    period_days_count: 5,
  },
  // Previous completed cycle: started Sep 1, period completed Sep 1-5 (5 days)
  {
    id: "c-prev",
    user_id: "user-1",
    start_date: "2026-09-01",
    end_date: "2026-09-05",
    cycle_length: 28,
    period_duration: 5,
    notes: null,
    created_at: "",
    updated_at: "",
    period_days: [
      { id: "p1", cycle_id: "c-prev", user_id: "user-1", date: "2026-09-01", flow: "heavy", created_at: "" },
      { id: "p2", cycle_id: "c-prev", user_id: "user-1", date: "2026-09-02", flow: "heavy", created_at: "" },
      { id: "p3", cycle_id: "c-prev", user_id: "user-1", date: "2026-09-03", flow: "medium", created_at: "" },
      { id: "p4", cycle_id: "c-prev", user_id: "user-1", date: "2026-09-04", flow: "light", created_at: "" },
      { id: "p5", cycle_id: "c-prev", user_id: "user-1", date: "2026-09-05", flow: "light", created_at: "" },
    ],
    period_days_count: 5,
  },
]

// Testing reference date during current cycle: Oct 10
const refOct10 = "2026-10-10"
const s3_current = getCurrentCycle(multiCycles, refOct10)
assert(s3_current?.id === "c-curr", "S3: Current cycle is c-curr on Oct 10")
const s3_day = calculateCurrentCycleDay(s3_current!.start_date, refOct10)
assert(s3_day === 12, `S3: Current day on Oct 10 (started Sep 29) is 12, got ${s3_day}`)
const s3_status = getCurrentCycleStatus(s3_current, refOct10)
assert(s3_status.status === "Cycle day X", `S3: Status is Cycle day X, got '${s3_status.status}'`)
assert(!s3_status.isOnPeriod, "S3: Not on period on Oct 10")

const s3_avgCycle = calculateAverageCycleLength(multiCycles)
assert(s3_avgCycle === 28, `S3: Avg cycle length is 28, got ${s3_avgCycle}`)

const s3_avgPeriod = calculateAveragePeriodDuration(multiCycles)
assert(s3_avgPeriod === 5, `S3: Avg period duration is 5, got ${s3_avgPeriod}`)

const s3_estNext = calculateEstimatedNextPeriod({
  latestCycleStartDate: s3_current?.start_date ?? null,
  averageCycleLength: s3_avgCycle,
  typicalCycleLength: 30,
  referenceDateStr: refOct10,
})
assert(s3_estNext?.estimatedStartDate === "2026-10-27", `S3: Estimated next period is Oct 27, got ${s3_estNext?.estimatedStartDate}`)
assert(s3_estNext?.isFallback === false, "S3: Uses historical avg cycle length (not fallback)")

const s3_progress = calculateCycleProgress({ currentCycleDay: s3_day, expectedCycleLength: s3_avgCycle! })
assert(s3_progress.progressPercent === 43, `S3: Progress day 12 of 28 is 43%, got ${s3_progress.progressPercent}%`)

console.log("\n=== ALL SCENARIOS VERIFIED SUCCESSFULLY ===")
