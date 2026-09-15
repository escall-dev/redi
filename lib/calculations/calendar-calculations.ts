import type { CycleRecord, PeriodDayRecord, FlowLevel } from "@/app/actions/cycles"
import {
  parseDateString,
  formatDateToString,
  calculateDaysBetween,
  getTodayDateString,
} from "./cycle-calculations"

export interface CalendarDayCell {
  dateStr: string // YYYY-MM-DD
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isFuture: boolean
  periodDay: PeriodDayRecord | null
  cycle: CycleRecord | null
  cycleDay: number | null
}

export interface SelectedDateContext {
  dateStr: string
  formattedDate: string
  isToday: boolean
  isFuture: boolean
  isBeforeHistory: boolean
  isPeriodDay: boolean
  flow: FlowLevel | null
  periodDayIndex: number | null
  periodDaysCount: number | null
  cycle: CycleRecord | null
  cycleDay: number | null
  isTrackingStartDay: boolean
  statusMessage: string
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/**
 * Returns month name from 0-indexed month (0 = January)
 */
export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex] ?? ""
}

/**
 * Formats a YYYY-MM-DD string into a full human-readable date.
 * E.g., "Monday, September 15, 2026"
 */
export function formatFullDate(dateStr: string): string {
  if (!dateStr) return ""
  const date = parseDateString(dateStr)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Formats a YYYY-MM-DD string into a medium date.
 * E.g., "Sep 15, 2026"
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return ""
  const date = parseDateString(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Calculates cycle day for a date strictly from cycle start date:
 * cycle_day = selected_date - cycle.start_date + 1
 * Never calculated from period start/end dates.
 */
export function calculateCycleDayForDate(cycleStartDate: string, dateStr: string): number {
  const daysDiff = calculateDaysBetween(cycleStartDate, dateStr)
  return daysDiff + 1
}

/**
 * Determines which known cycle contains the specified date.
 *
 * Rules:
 * 1. Future dates (dateStr > todayStr) are not treated as logged cycles (no fabrication).
 * 2. Dates prior to the earliest cycle start date return null (no tracked cycle data).
 * 3. A date belongs to cycle c_i if c_i.start_date <= dateStr < c_{i+1}.start_date.
 * 4. For the latest cycle c_k, dateStr belongs if dateStr >= c_k.start_date and dateStr <= todayStr.
 */
export function getCycleForDate(
  cycles: CycleRecord[],
  dateStr: string,
  todayStr: string = getTodayDateString()
): CycleRecord | null {
  if (!cycles || cycles.length === 0) return null

  // Future dates should not have fabricated cycle context
  if (dateStr > todayStr) return null

  // Sort cycles ascending chronologically
  const sorted = [...cycles].sort((a, b) => (a.start_date > b.start_date ? 1 : -1))

  // Date is before tracked history
  if (dateStr < sorted[0].start_date) return null

  for (let i = 0; i < sorted.length; i++) {
    const cycle = sorted[i]
    const nextCycle = sorted[i + 1]

    if (dateStr >= cycle.start_date) {
      if (!nextCycle || dateStr < nextCycle.start_date) {
        return cycle
      }
    }
  }

  return null
}

/**
 * Finds the period day record for a given date from an array of period days.
 */
export function getPeriodDayForDate(
  periodDays: PeriodDayRecord[],
  dateStr: string
): PeriodDayRecord | null {
  if (!periodDays || periodDays.length === 0) return null
  return periodDays.find((pd) => pd.date === dateStr) ?? null
}

/**
 * Extracts all unique period days from a collection of cycles.
 */
export function extractAllPeriodDays(cycles: CycleRecord[]): PeriodDayRecord[] {
  const map = new Map<string, PeriodDayRecord>()
  for (const cycle of cycles) {
    if (cycle.period_days) {
      for (const pd of cycle.period_days) {
        map.set(pd.date, pd)
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.date > b.date ? 1 : -1))
}

/**
 * Builds the complete 35 or 42 cell monthly calendar grid for year and month (0-indexed).
 * Correctly computes ISO dates for adjacent-month boundary days so data lookup never leaks.
 */
export function getCalendarGrid(params: {
  year: number
  month: number // 0-indexed (0 = Jan, 11 = Dec)
  cycles: CycleRecord[]
  todayStr?: string
}): CalendarDayCell[] {
  const { year, month, cycles, todayStr = getTodayDateString() } = params

  const allPeriodDays = extractAllPeriodDays(cycles)
  const periodDaysMap = new Map<string, PeriodDayRecord>()
  for (const pd of allPeriodDays) {
    periodDaysMap.set(pd.date, pd)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sunday

  const cells: CalendarDayCell[] = []

  // 1. Previous month trailing days
  if (firstDayOfWeek > 0) {
    const prevMonthDaysCount = new Date(year, month, 0).getDate()
    const startPrevDay = prevMonthDaysCount - firstDayOfWeek + 1

    for (let day = startPrevDay; day <= prevMonthDaysCount; day++) {
      // Calculate previous month & year
      const prevDate = new Date(year, month - 1, day)
      const dateStr = formatDateToString(prevDate)
      const periodDay = periodDaysMap.get(dateStr) ?? null
      const cycle = getCycleForDate(cycles, dateStr, todayStr)
      const cycleDay = cycle ? calculateCycleDayForDate(cycle.start_date, dateStr) : null

      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
        periodDay,
        cycle,
        cycleDay,
      })
    }
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day)
    const dateStr = formatDateToString(currentDate)
    const periodDay = periodDaysMap.get(dateStr) ?? null
    const cycle = getCycleForDate(cycles, dateStr, todayStr)
    const cycleDay = cycle ? calculateCycleDayForDate(cycle.start_date, dateStr) : null

    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
      periodDay,
      cycle,
      cycleDay,
    })
  }

  // 3. Next month leading days to complete the weekly grid
  const totalSoFar = cells.length
  const remainder = totalSoFar % 7
  const nextMonthDaysNeeded = remainder === 0 ? 0 : 7 - remainder

  for (let day = 1; day <= nextMonthDaysNeeded; day++) {
    const nextDate = new Date(year, month + 1, day)
    const dateStr = formatDateToString(nextDate)
    const periodDay = periodDaysMap.get(dateStr) ?? null
    const cycle = getCycleForDate(cycles, dateStr, todayStr)
    const cycleDay = cycle ? calculateCycleDayForDate(cycle.start_date, dateStr) : null

    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
      periodDay,
      cycle,
      cycleDay,
    })
  }

  return cells
}

/**
 * Computes full context details for a user-selected date.
 */
export function getSelectedDateContext(params: {
  selectedDateStr: string
  cycles: CycleRecord[]
  todayStr?: string
}): SelectedDateContext {
  const { selectedDateStr, cycles, todayStr = getTodayDateString() } = params

  const isToday = selectedDateStr === todayStr
  const isFuture = selectedDateStr > todayStr
  const formattedDate = formatFullDate(selectedDateStr)

  // Find period day record if one exists
  const allPeriodDays = extractAllPeriodDays(cycles)
  const periodDay = getPeriodDayForDate(allPeriodDays, selectedDateStr)
  const isPeriodDay = Boolean(periodDay)
  const flow: FlowLevel | null = periodDay ? periodDay.flow : null

  // Check earliest cycle start date
  const sortedCycles = [...cycles].sort((a, b) => (a.start_date > b.start_date ? 1 : -1))
  const earliestStart = sortedCycles.length > 0 ? sortedCycles[0].start_date : null
  const isBeforeHistory = earliestStart !== null && selectedDateStr < earliestStart

  // Cycle attribution
  const cycle = getCycleForDate(cycles, selectedDateStr, todayStr)
  const cycleDay = cycle ? calculateCycleDayForDate(cycle.start_date, selectedDateStr) : null

  // Check if this date is the initial tracking start date
  const isTrackingStartDay = Boolean(cycle && cycle.start_date === selectedDateStr)

  // Calculate period day index within its cycle (e.g., Day 2 of period)
  let periodDayIndex: number | null = null
  let periodDaysCount: number | null = null
  if (isPeriodDay && cycle && cycle.period_days && cycle.period_days.length > 0) {
    const sortedDays = [...cycle.period_days].sort((a, b) => (a.date > b.date ? 1 : -1))
    periodDaysCount = sortedDays.length
    const idx = sortedDays.findIndex((pd) => pd.date === selectedDateStr)
    if (idx !== -1) {
      periodDayIndex = idx + 1
    }
  }

  // Construct clear status message
  let statusMessage = ""
  if (isFuture) {
    statusMessage = "Future date — no tracked data recorded."
  } else if (isBeforeHistory || (!cycle && !isPeriodDay)) {
    statusMessage = "No tracked cycle data exists for this date."
  } else if (isPeriodDay) {
    const flowText = flow ? `${flow} flow` : "Period day"
    statusMessage = periodDayIndex
      ? `Period Day ${periodDayIndex} (${flowText})`
      : `Period Day (${flowText})`
  } else if (cycle) {
    if (cycle.period_days && cycle.period_days.length === 0 && isTrackingStartDay) {
      statusMessage = "Your tracking starts here."
    } else {
      statusMessage = `Cycle Day ${cycleDay} — No period logged`
    }
  }

  return {
    dateStr: selectedDateStr,
    formattedDate,
    isToday,
    isFuture,
    isBeforeHistory,
    isPeriodDay,
    flow,
    periodDayIndex,
    periodDaysCount,
    cycle,
    cycleDay,
    isTrackingStartDay,
    statusMessage,
  }
}
