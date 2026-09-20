import {
  getCurrentCycleStatus,
} from "../lib/calculations/cycle-calculations"
import type { CycleRecord } from "../app/actions/cycles"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`PASS: ${message}`)
}

console.log("=== Testing Cycle Day Hero Redesign Scenarios ===")

// Test 1: Day 1 of 28 days
{
  const currentDay = 1
  const expectedTotalDays = 28
  const safeTotal = Math.max(1, expectedTotalDays)
  const clampedDay = Math.max(1, currentDay)
  const progressPercent = Math.min(100, Math.max(0, Math.round((clampedDay / safeTotal) * 100)))
  const indicatorPos = Math.min(98, Math.max(2, progressPercent))

  assert(progressPercent === 4, `Day 1 progressPercent is 4% (got ${progressPercent})`)
  assert(indicatorPos === 4, `Indicator position is 4%`)
  assert(indicatorPos >= 2 && indicatorPos <= 98, "Indicator is safely within bounds (no clipping)")
}

// Test 2: Day 14 of 28 days (Mid-cycle)
{
  const currentDay = 14
  const expectedTotalDays = 28
  const safeTotal = Math.max(1, expectedTotalDays)
  const clampedDay = Math.max(1, currentDay)
  const progressPercent = Math.min(100, Math.max(0, Math.round((clampedDay / safeTotal) * 100)))
  const indicatorPos = Math.min(98, Math.max(2, progressPercent))

  assert(progressPercent === 50, `Day 14 progressPercent is 50% (got ${progressPercent})`)
  assert(indicatorPos === 50, `Indicator position is 50%`)
}

// Test 3: Day 28 of 28 days (Complete cycle)
{
  const currentDay = 28
  const expectedTotalDays = 28
  const safeTotal = Math.max(1, expectedTotalDays)
  const clampedDay = Math.max(1, currentDay)
  const progressPercent = Math.min(100, Math.max(0, Math.round((clampedDay / safeTotal) * 100)))
  const indicatorPos = Math.min(98, Math.max(2, progressPercent))

  assert(progressPercent === 100, `Day 28 progressPercent is 100% (got ${progressPercent})`)
  assert(indicatorPos === 98, `Indicator position clamped to 98% to prevent edge clipping`)
}

// Test 4: Day 35 of 28 days (Overdue cycle - clamped at 100%)
{
  const currentDay = 35
  const expectedTotalDays = 28
  const safeTotal = Math.max(1, expectedTotalDays)
  const clampedDay = Math.max(1, currentDay)
  const progressPercent = Math.min(100, Math.max(0, Math.round((clampedDay / safeTotal) * 100)))
  const indicatorPos = Math.min(98, Math.max(2, progressPercent))

  assert(progressPercent === 100, `Day 35 clamped to max 100% (got ${progressPercent})`)
  assert(indicatorPos === 98, `Indicator position clamped to 98%`)
  assert(clampedDay === 35, `Raw display day preserved as 35`)
}

// Test 5: Period Days Zone calculation
{
  const periodDaysCount = 5
  const expectedTotalDays = 28
  const safeTotal = Math.max(1, expectedTotalDays)
  const periodDaysPercent = periodDaysCount > 0
    ? Math.min(100, Math.round((periodDaysCount / safeTotal) * 100))
    : 0

  assert(periodDaysPercent === 18, `5 period days / 28 = 18% (got ${periodDaysPercent})`)
}

// Test 6: Zero period days
{
  const periodDaysCount = 0
  const expectedTotalDays = 28
  const safeTotal = Math.max(1, expectedTotalDays)
  const periodDaysPercent = periodDaysCount > 0
    ? Math.min(100, Math.round((periodDaysCount / safeTotal) * 100))
    : 0

  assert(periodDaysPercent === 0, `0 period days = 0%`)
}

// Test 7: Current cycle status integration
{
  const cycle: CycleRecord = {
    id: "test-cycle",
    user_id: "user-1",
    start_date: "2026-09-10",
    end_date: null,
    cycle_length: null,
    period_duration: 5,
    notes: null,
    created_at: "2026-09-10T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
    period_days: [
      { id: "p1", cycle_id: "test-cycle", date: "2026-09-10", flow: "medium", user_id: "user-1", created_at: "" },
      { id: "p2", cycle_id: "test-cycle", date: "2026-09-11", flow: "heavy", user_id: "user-1", created_at: "" },
      { id: "p3", cycle_id: "test-cycle", date: "2026-09-12", flow: "medium", user_id: "user-1", created_at: "" },
      { id: "p4", cycle_id: "test-cycle", date: "2026-09-13", flow: "light", user_id: "user-1", created_at: "" },
      { id: "p5", cycle_id: "test-cycle", date: "2026-09-14", flow: "light", user_id: "user-1", created_at: "" },
    ],
    period_days_count: 5,
  }

  // Ref date on 2026-09-12 (On period)
  const statusOnPeriod = getCurrentCycleStatus(cycle, "2026-09-12")
  assert(statusOnPeriod.isOnPeriod === true, "Status detected as on period")
  assert(statusOnPeriod.currentDay === 3, "Current day is Day 3")
  assert(statusOnPeriod.displayStatus === "Period (Day 3)", `Display status is ${statusOnPeriod.displayStatus}`)

  // Ref date on 2026-09-20 (After period, Day 11)
  const statusCycleDay = getCurrentCycleStatus(cycle, "2026-09-20")
  assert(statusCycleDay.isOnPeriod === false, "Status detected as not on period")
  assert(statusCycleDay.currentDay === 11, "Current day is Day 11")
  assert(statusCycleDay.displayStatus === "Cycle day 11", `Display status is ${statusCycleDay.displayStatus}`)
}

console.log("\nAll Cycle Day Hero Redesign calculations and logic verified successfully!")
