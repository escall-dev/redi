/**
 * Seijun Phase 20: Affinity & Relationship Duration Calculations
 *
 * Implements deterministic calendar arithmetic and dynamic formatters for
 * partner relationship duration tracking across years, months, weeks, and days.
 *
 * Guaranteed Invariants:
 * - Timezone & DST immune: uses date-only parsing and integer UTC midnight differences.
 * - Accurate month-borrowing taking variable days per month (including leap years) into account.
 * - Dynamic: calculations can be re-evaluated as current time advances.
 * - Strict validation rejecting invalid date patterns, non-existent calendar dates, and future dates.
 */

import type { AffinityDisplayFormat, RelationshipDurationResult } from "./types"

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
] as const

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Safely parses a YYYY-MM-DD string into integer components.
 * Returns null if string format is invalid or day exceeds month capacity.
 */
export function parseCalendarDate(
  dateStr: string
): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null
  const trimmed = dateStr.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null

  const [yStr, mStr, dStr] = trimmed.split("-")
  const year = Number(yStr)
  const month = Number(mStr)
  const day = Number(dStr)

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null

  // Validate exact days in month for leap years and 30-day months
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day > daysInMonth) return null

  return { year, month, day }
}

/**
 * Validates whether a relationship start date string is acceptable.
 * Rejects:
 * - Malformed strings
 * - Calendar dates that do not exist (e.g. Feb 30)
 * - Years before 1900
 * - Future dates relative to referenceDateStr (default today)
 */
export function isValidRelationshipDate(
  dateStr: string,
  referenceDateStr?: string
): { valid: boolean; error?: string } {
  if (!dateStr || typeof dateStr !== "string" || dateStr.trim().length === 0) {
    return { valid: false, error: "Please enter a valid date." }
  }

  const parsed = parseCalendarDate(dateStr)
  if (!parsed) {
    return { valid: false, error: "Invalid date format. Please use YYYY-MM-DD." }
  }

  if (parsed.year < 1900) {
    return { valid: false, error: "Date cannot be earlier than the year 1900." }
  }

  const todayStr = referenceDateStr || getTodayDateString()
  if (dateStr.trim() > todayStr) {
    return { valid: false, error: "Relationship start date cannot be in the future." }
  }

  return { valid: true }
}

/**
 * Formats a YYYY-MM-DD date into a readable string: e.g. "May 14, 2023"
 */
export function formatAnniversaryDate(dateStr: string): string {
  const parsed = parseCalendarDate(dateStr)
  if (!parsed) return dateStr
  const monthName = MONTH_NAMES[parsed.month - 1]
  return `${monthName} ${parsed.day}, ${parsed.year}`
}

/**
 * Calculates relationship duration dynamically from stored start date to current reference date.
 */
export function calculateRelationshipDuration(
  startDateStr: string,
  currentDateStr?: string,
  format: AffinityDisplayFormat = "detailed"
): RelationshipDurationResult {
  const refStr = currentDateStr || getTodayDateString()
  const startParsed = parseCalendarDate(startDateStr)
  const currentParsed = parseCalendarDate(refStr)

  if (!startParsed || !currentParsed) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      totalWeeks: 0,
      remainingDaysAfterWeeks: 0,
      totalMonths: 0,
      formattedText: "Invalid date",
      primaryLabel: "Invalid date",
      isToday: false,
      isFuture: false,
    }
  }

  // Future date check
  if (startDateStr > refStr) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      totalWeeks: 0,
      remainingDaysAfterWeeks: 0,
      totalMonths: 0,
      formattedText: "Future date",
      primaryLabel: "Future date",
      isToday: false,
      isFuture: true,
    }
  }

  // 1. Total cumulative days (UTC midnight arithmetic ensures DST immunity)
  const utcStart = Date.UTC(startParsed.year, startParsed.month - 1, startParsed.day)
  const utcCurrent = Date.UTC(currentParsed.year, currentParsed.month - 1, currentParsed.day)
  const diffMs = utcCurrent - utcStart
  const totalDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))

  // 2. Exact Calendar breakdown (years, months, days)
  let years = currentParsed.year - startParsed.year
  let months = currentParsed.month - startParsed.month
  let days = currentParsed.day - startParsed.day

  if (days < 0) {
    // Borrow days from previous month of current year
    const daysInPreviousMonth = new Date(currentParsed.year, currentParsed.month - 1, 0).getDate()
    days += daysInPreviousMonth
    months -= 1
  }

  if (months < 0) {
    months += 12
    years -= 1
  }

  // 3. Aggregate metrics
  const totalMonths = years * 12 + months
  const totalWeeks = Math.floor(totalDays / 7)
  const remainingDaysAfterWeeks = totalDays % 7
  const isToday = totalDays === 0

  // 4. Format according to user preference
  const formattedText = formatRelationshipDurationText(
    {
      years,
      months,
      days,
      totalDays,
      totalWeeks,
      remainingDaysAfterWeeks,
      totalMonths,
      isToday,
    },
    format
  )

  const primaryLabel = getPrimaryDurationLabel({ years, months, days, totalDays, isToday }, format)
  const secondaryLabel = getSecondaryDurationLabel({ totalDays, totalWeeks, isToday })

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks,
    remainingDaysAfterWeeks,
    totalMonths,
    formattedText,
    primaryLabel,
    secondaryLabel,
    isToday,
    isFuture: false,
  }
}

/**
 * Internal helper to format the duration text based on chosen display format.
 */
function formatRelationshipDurationText(
  diff: {
    years: number
    months: number
    days: number
    totalDays: number
    totalWeeks: number
    remainingDaysAfterWeeks: number
    totalMonths: number
    isToday: boolean
  },
  format: AffinityDisplayFormat
): string {
  if (diff.isToday) {
    return "Started today"
  }

  switch (format) {
    case "years_months": {
      if (diff.years > 0 && diff.months > 0) {
        return `${diff.years} ${diff.years === 1 ? "year" : "years"}, ${diff.months} ${diff.months === 1 ? "month" : "months"}`
      }
      if (diff.years > 0 && diff.months === 0) {
        return `${diff.years} ${diff.years === 1 ? "year" : "years"}`
      }
      if (diff.years === 0 && diff.months > 0) {
        return `${diff.months} ${diff.months === 1 ? "month" : "months"}`
      }
      return `${diff.totalDays} ${diff.totalDays === 1 ? "day" : "days"}`
    }

    case "months_days": {
      if (diff.totalMonths > 0 && diff.days > 0) {
        return `${diff.totalMonths} ${diff.totalMonths === 1 ? "month" : "months"}, ${diff.days} ${diff.days === 1 ? "day" : "days"}`
      }
      if (diff.totalMonths > 0 && diff.days === 0) {
        return `${diff.totalMonths} ${diff.totalMonths === 1 ? "month" : "months"}`
      }
      return `${diff.totalDays} ${diff.totalDays === 1 ? "day" : "days"}`
    }

    case "weeks_days": {
      if (diff.totalWeeks > 0 && diff.remainingDaysAfterWeeks > 0) {
        return `${diff.totalWeeks} ${diff.totalWeeks === 1 ? "week" : "weeks"}, ${diff.remainingDaysAfterWeeks} ${diff.remainingDaysAfterWeeks === 1 ? "day" : "days"}`
      }
      if (diff.totalWeeks > 0 && diff.remainingDaysAfterWeeks === 0) {
        return `${diff.totalWeeks} ${diff.totalWeeks === 1 ? "week" : "weeks"}`
      }
      return `${diff.totalDays} ${diff.totalDays === 1 ? "day" : "days"}`
    }

    case "total_days": {
      return `${diff.totalDays} ${diff.totalDays === 1 ? "day" : "days"}`
    }

    case "detailed":
    default: {
      const parts: string[] = []
      if (diff.years > 0) {
        parts.push(`${diff.years} ${diff.years === 1 ? "year" : "years"}`)
      }
      if (diff.months > 0) {
        parts.push(`${diff.months} ${diff.months === 1 ? "month" : "months"}`)
      }
      if (diff.days > 0 || parts.length === 0) {
        parts.push(`${diff.days} ${diff.days === 1 ? "day" : "days"}`)
      }
      return parts.join(", ")
    }
  }
}

function getPrimaryDurationLabel(
  diff: {
    years: number
    months: number
    days: number
    totalDays: number
    isToday: boolean
  },
  format: AffinityDisplayFormat
): string {
  if (diff.isToday) return "Today"

  if (format === "total_days") {
    return `${diff.totalDays} ${diff.totalDays === 1 ? "Day" : "Days"}`
  }

  if (diff.years > 0) {
    if (diff.months > 0) {
      return `${diff.years}y ${diff.months}m`
    }
    return `${diff.years} ${diff.years === 1 ? "Year" : "Years"}`
  }

  if (diff.months > 0) {
    if (diff.days > 0) {
      return `${diff.months}m ${diff.days}d`
    }
    return `${diff.months} ${diff.months === 1 ? "Month" : "Months"}`
  }

  return `${diff.days} ${diff.days === 1 ? "Day" : "Days"}`
}

function getSecondaryDurationLabel(diff: {
  totalDays: number
  totalWeeks: number
  isToday: boolean
}): string {
  if (diff.isToday) return "Day 1 of your journey together"
  if (diff.totalDays < 7) {
    return `${diff.totalDays} ${diff.totalDays === 1 ? "day" : "days"} together`
  }
  return `${diff.totalDays.toLocaleString()} days (${diff.totalWeeks.toLocaleString()} weeks) together`
}
