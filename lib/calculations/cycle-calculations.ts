import type { CycleRecord } from "@/app/actions/cycles"

/**
 * Parses a YYYY-MM-DD string into a local Date object set at 00:00:00
 */
export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Formats a Date object into YYYY-MM-DD
 */
export function formatDateToString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateString(): string {
  return formatDateToString(new Date())
}

/**
 * Calculates inclusive difference in days between two YYYY-MM-DD date strings
 */
export function calculateInclusiveDays(startStr: string, endStr: string): number {
  const start = parseDateString(startStr)
  const end = parseDateString(endStr)
  const diffTime = end.getTime() - start.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Calculates days between two YYYY-MM-DD dates (later - earlier)
 */
export function calculateDaysBetween(earlierStr: string, laterStr: string): number {
  const earlier = parseDateString(earlierStr)
  const later = parseDateString(laterStr)
  const diffTime = later.getTime() - earlier.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Determine the user's current cycle from the most recent cycle whose start date is today or earlier.
 */
export function getCurrentCycle(
  cycles: CycleRecord[],
  referenceDateStr: string = getTodayDateString()
): CycleRecord | null {
  if (!cycles || cycles.length === 0) return null

  // Filter cycles that started on or before referenceDate, ordered by start_date DESC
  const eligible = cycles
    .filter((c) => c.start_date <= referenceDateStr)
    .sort((a, b) => (b.start_date > a.start_date ? 1 : b.start_date < a.start_date ? -1 : 0))

  return eligible[0] ?? null
}

/**
 * Current cycle day calculation:
 * today - current cycle.start_date + 1
 * Never less than 1.
 */
export function calculateCurrentCycleDay(
  cycleStartDate: string,
  referenceDateStr: string = getTodayDateString()
): number {
  const daysDiff = calculateDaysBetween(cycleStartDate, referenceDateStr)
  return Math.max(1, daysDiff + 1)
}

export interface CurrentCycleStatus {
  status: "Period" | "Cycle day X" | "Tracking started" | "No period logged yet" | "No active cycle"
  displayStatus: string
  isOnPeriod: boolean
  currentDay: number | null
}

/**
 * Determines current cycle status without medical certainty.
 */
export function getCurrentCycleStatus(
  currentCycle: CycleRecord | null,
  referenceDateStr: string = getTodayDateString()
): CurrentCycleStatus {
  if (!currentCycle) {
    return {
      status: "No active cycle",
      displayStatus: "No active cycle",
      isOnPeriod: false,
      currentDay: null,
    }
  }

  const currentDay = calculateCurrentCycleDay(currentCycle.start_date, referenceDateStr)
  const periodDays = currentCycle.period_days || []

  // Check if today is explicitly logged as a period day
  const isPeriodDayToday = periodDays.some((pd) => pd.date === referenceDateStr)

  if (isPeriodDayToday) {
    return {
      status: "Period",
      displayStatus: `Period (Day ${currentDay})`,
      isOnPeriod: true,
      currentDay,
    }
  }

  // If no period days have been logged for this cycle at all
  if (periodDays.length === 0) {
    if (currentDay <= 3) {
      return {
        status: "Tracking started",
        displayStatus: "Tracking started",
        isOnPeriod: false,
        currentDay,
      }
    }
    return {
      status: "No period logged yet",
      displayStatus: "No period logged yet",
      isOnPeriod: false,
      currentDay,
    }
  }

  // Period days exist but today is not logged as period
  return {
    status: "Cycle day X",
    displayStatus: `Cycle day ${currentDay}`,
    isOnPeriod: false,
    currentDay,
  }
}

export interface LatestPeriodInfo {
  startDate: string
  endDate: string | null
  duration: number | null
  isOngoing: boolean
  cycleId: string
  periodDaysCount: number
}

/**
 * Returns latest explicit period from actual period_days and cycle data.
 * Returns null if no explicit period days have been logged.
 */
export function getLatestPeriod(cycles: CycleRecord[]): LatestPeriodInfo | null {
  if (!cycles || cycles.length === 0) return null

  // Sort cycles DESC to inspect newest cycles first
  const sorted = [...cycles].sort((a, b) =>
    b.start_date > a.start_date ? 1 : b.start_date < a.start_date ? -1 : 0
  )

  for (const cycle of sorted) {
    const pDays = cycle.period_days || []
    if (pDays.length > 0) {
      // Sort period days ASC
      const sortedDays = [...pDays].sort((a, b) =>
        a.date > b.date ? 1 : a.date < b.date ? -1 : 0
      )
      const firstDay = sortedDays[0].date
      const lastDay = sortedDays[sortedDays.length - 1].date

      let duration = cycle.period_duration
      if (!duration) {
        duration = cycle.end_date
          ? calculateInclusiveDays(firstDay, cycle.end_date)
          : sortedDays.length
      }

      return {
        startDate: firstDay,
        endDate: cycle.end_date || (cycle.end_date === null ? null : lastDay),
        duration,
        isOngoing: !cycle.end_date,
        cycleId: cycle.id,
        periodDaysCount: sortedDays.length,
      }
    }
  }

  return null
}

/**
 * Average cycle length:
 * Uses completed consecutive cycle intervals from actual cycle start dates.
 * Returns null if there are fewer than 2 cycles.
 */
export function calculateAverageCycleLength(cycles: CycleRecord[]): number | null {
  if (!cycles || cycles.length < 2) return null

  // Sort ASC to find consecutive intervals
  const sorted = [...cycles].sort((a, b) =>
    a.start_date > b.start_date ? 1 : a.start_date < b.start_date ? -1 : 0
  )

  const intervals: number[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = calculateDaysBetween(sorted[i].start_date, sorted[i + 1].start_date)
    // Only accept realistic consecutive intervals
    if (diff > 0 && diff < 120) {
      intervals.push(diff)
    }
  }

  if (intervals.length === 0) return null

  const sum = intervals.reduce((acc, curr) => acc + curr, 0)
  return Math.round(sum / intervals.length)
}

/**
 * Average period duration:
 * Uses cycles with known start/end dates or explicitly logged period-day ranges.
 * Excludes incomplete / ongoing periods where doing so would produce misleading values.
 */
export function calculateAveragePeriodDuration(cycles: CycleRecord[]): number | null {
  if (!cycles || cycles.length === 0) return null

  const durations: number[] = []

  for (const cycle of cycles) {
    if (cycle.end_date) {
      if (cycle.period_duration && cycle.period_duration > 0) {
        durations.push(cycle.period_duration)
      } else if (cycle.period_days && cycle.period_days.length > 0) {
        durations.push(cycle.period_days.length)
      }
    }
  }

  if (durations.length === 0) return null

  const sum = durations.reduce((acc, curr) => acc + curr, 0)
  return Math.round(sum / durations.length)
}

export interface EstimatedNextPeriod {
  estimatedStartDate: string // YYYY-MM-DD
  daysUntil: number
  isFallback: boolean // True if using profile typical_cycle_length rather than completed history
  cycleLengthUsed: number
}

/**
 * Calculate:
 * estimated_next_period = latest_cycle.start_date + average_cycle_length
 * Uses average_cycle_length if available; falls back to typicalCycleLength.
 */
export function calculateEstimatedNextPeriod(params: {
  latestCycleStartDate: string | null
  averageCycleLength: number | null
  typicalCycleLength: number | null
  referenceDateStr?: string
}): EstimatedNextPeriod | null {
  const {
    latestCycleStartDate,
    averageCycleLength,
    typicalCycleLength,
    referenceDateStr = getTodayDateString(),
  } = params

  if (!latestCycleStartDate) return null

  const hasHistory = averageCycleLength !== null && averageCycleLength > 0
  const cycleLength = hasHistory ? averageCycleLength! : typicalCycleLength

  if (!cycleLength || cycleLength <= 0) return null

  const start = parseDateString(latestCycleStartDate)
  const estimatedDate = new Date(start)
  estimatedDate.setDate(estimatedDate.getDate() + cycleLength)

  const estimatedStartDate = formatDateToString(estimatedDate)
  const daysUntil = calculateDaysBetween(referenceDateStr, estimatedStartDate)

  return {
    estimatedStartDate,
    daysUntil,
    isFallback: !hasHistory,
    cycleLengthUsed: cycleLength,
  }
}

export interface CycleProgress {
  progressPercent: number
  day: number
  expectedTotalDays: number
}

/**
 * Calculates simple cycle progress percentage against expected cycle length
 */
export function calculateCycleProgress(params: {
  currentCycleDay: number
  expectedCycleLength: number
}): CycleProgress {
  const { currentCycleDay, expectedCycleLength } = params
  const validTotal = Math.max(1, expectedCycleLength)
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentCycleDay / validTotal) * 100)))

  return {
    progressPercent,
    day: currentCycleDay,
    expectedTotalDays: validTotal,
  }
}
