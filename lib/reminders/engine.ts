/**
 * Seijun Phase 18: Smart Cycle Reminder Engine
 *
 * Centralized, deterministic calculation engine for cycle-related reminder events.
 *
 * DESIGN INVARIANTS:
 * 1. Rule-Based & Deterministic: Zero AI, zero random outcomes, zero external dependencies.
 * 2. Account Classification Aware: Supporters receive 0 reminders; cycle_tracker and both receive reminders.
 * 3. Data Sufficiency Guard: Suppresses prediction-based reminders if baseline cycle data is missing.
 * 4. User Preference Driven: Only generates reminders for categories explicitly enabled by user.
 * 5. Flexible Timing: Honors user-configured reminder_days_before (3 days, 1 day, or 0 days).
 */

import {
  parseDateString,
  formatDateToString,
  getTodayDateString,
  calculateAverageCycleLength,
  calculateAveragePeriodDuration,
  getCurrentCycle,
  calculateDaysBetween,
} from "@/lib/calculations/cycle-calculations"
import type {
  ReminderEngineParams,
  ReminderEngineResult,
  ReminderCandidate,
} from "./types"
import { getReminderTemplate } from "./templates"

/**
 * Adds an integer number of days to a Date object, returning a new Date at midnight.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Calculates deterministic cycle reminder candidates for a given user context.
 */
export function calculateCycleReminders(
  params: ReminderEngineParams
): ReminderEngineResult {
  const {
    profile,
    cycles = [],
    preferences,
    referenceDateStr = getTodayDateString(),
  } = params

  // 1. Account Classification Check (Phase 16)
  // supporters must NOT receive personal cycle-owner reminders
  if (profile.usage_role === "supporter") {
    return {
      eligible: false,
      reason: "Account role 'supporter' is suppressed from personal cycle reminders.",
      candidates: [],
      calculatedCycleLength: null,
      estimatedNextPeriodDate: null,
      estimatedOvulationDate: null,
      estimatedFertileStartDate: null,
    }
  }

  // 2. Data Sufficiency Check
  // Determine baseline start date
  const currentCycle = getCurrentCycle(cycles, referenceDateStr)
  const latestCycleStartDate =
    currentCycle?.start_date ?? profile.last_period_start ?? null

  // If no start date exists at all, suppress predictions
  if (!latestCycleStartDate) {
    return {
      eligible: false,
      reason: "Insufficient cycle data: no period or onboarding start date recorded.",
      candidates: [],
      calculatedCycleLength: null,
      estimatedNextPeriodDate: null,
      estimatedOvulationDate: null,
      estimatedFertileStartDate: null,
    }
  }

  // Calculate effective cycle length
  const avgCycleLength = calculateAverageCycleLength(cycles)
  const typicalCycleLength = profile.typical_cycle_length ?? 28
  const cycleLength = avgCycleLength || typicalCycleLength

  // If cycle length is unrealistic or non-positive, suppress predictions
  if (!cycleLength || cycleLength < 18 || cycleLength > 60) {
    return {
      eligible: false,
      reason: "Insufficient or irregular cycle history for reliable predictions.",
      candidates: [],
      calculatedCycleLength: null,
      estimatedNextPeriodDate: null,
      estimatedOvulationDate: null,
      estimatedFertileStartDate: null,
    }
  }

  // 3. Compute Key Cycle Milestones
  const cycleStartDate = parseDateString(latestCycleStartDate)
  const nextPeriodDate = addDays(cycleStartDate, cycleLength)
  const nextPeriodDateStr = formatDateToString(nextPeriodDate)

  // Ovulation: standard luteal phase model (14 days before expected next period)
  const ovulationDate = addDays(nextPeriodDate, -14)
  const ovulationDateStr = formatDateToString(ovulationDate)

  // Fertile Window: 5 days before ovulation up to ovulation day
  const fertileStartDate = addDays(ovulationDate, -5)
  const fertileStartDateStr = formatDateToString(fertileStartDate)

  const candidates: ReminderCandidate[] = []
  const cycleId = currentCycle?.id ?? null
  const reminderDaysBefore = preferences.reminder_days_before ?? 3

  // 4. Period Reminders (Upcoming & Expected)
  if (preferences.period_reminders) {
    // A. Upcoming Period Reminder (e.g. 3 days before or 1 day before)
    if (reminderDaysBefore > 0) {
      const upcomingDate = addDays(nextPeriodDate, -reminderDaysBefore)
      const upcomingDateStr = formatDateToString(upcomingDate)

      const template = getReminderTemplate("period_upcoming", {
        daysBefore: reminderDaysBefore,
      })
      candidates.push({
        type: "period_upcoming",
        scheduled_for: upcomingDateStr,
        cycle_id: cycleId,
        title: template.title,
        body: template.body,
        url: template.url,
        metadata: {
          reminderDaysBefore,
          expectedPeriodDate: nextPeriodDateStr,
        },
      })
    }

    // B. Expected Period Day Reminder (on expected day)
    const expectedTemplate = getReminderTemplate("period_expected")
    candidates.push({
      type: "period_expected",
      scheduled_for: nextPeriodDateStr,
      cycle_id: cycleId,
      title: expectedTemplate.title,
      body: expectedTemplate.body,
      url: expectedTemplate.url,
      metadata: {
        expectedPeriodDate: nextPeriodDateStr,
      },
    })
  }

  // 5. Fertile Window Reminders
  if (preferences.fertile_window_reminders) {
    // Remind 1 day before fertile window starts
    const fertileAlertDate = addDays(fertileStartDate, -1)
    const fertileAlertDateStr = formatDateToString(fertileAlertDate)

    const fertileTemplate = getReminderTemplate("fertile_window")
    candidates.push({
      type: "fertile_window",
      scheduled_for: fertileAlertDateStr,
      cycle_id: cycleId,
      title: fertileTemplate.title,
      body: fertileTemplate.body,
      url: fertileTemplate.url,
      metadata: {
        fertileStartDate: fertileStartDateStr,
        ovulationDate: ovulationDateStr,
      },
    })
  }

  // 6. Ovulation Reminders
  if (preferences.ovulation_reminders) {
    const ovulationTemplate = getReminderTemplate("ovulation")
    candidates.push({
      type: "ovulation",
      scheduled_for: ovulationDateStr,
      cycle_id: cycleId,
      title: ovulationTemplate.title,
      body: ovulationTemplate.body,
      url: ovulationTemplate.url,
      metadata: {
        ovulationDate: ovulationDateStr,
      },
    })
  }

  // 7. Cycle Transition Reminders (Luteal phase onset)
  if (preferences.cycle_transition_reminders) {
    // Transition to luteal phase begins day after ovulation
    const lutealStartDate = addDays(ovulationDate, 1)
    const lutealStartDateStr = formatDateToString(lutealStartDate)

    const transitionTemplate = getReminderTemplate("cycle_transition", {
      phaseName: "the luteal phase",
    })
    candidates.push({
      type: "cycle_transition",
      scheduled_for: lutealStartDateStr,
      cycle_id: cycleId,
      title: transitionTemplate.title,
      body: transitionTemplate.body,
      url: transitionTemplate.url,
      metadata: {
        phase: "luteal",
      },
    })
  }

  // 8. Missed / Late Period Reminder
  if (preferences.missed_period_reminders) {
    // Check 2 days after expected period date
    const missedDate = addDays(nextPeriodDate, 2)
    const missedDateStr = formatDateToString(missedDate)

    const missedTemplate = getReminderTemplate("missed_period")
    candidates.push({
      type: "missed_period",
      scheduled_for: missedDateStr,
      cycle_id: cycleId,
      title: missedTemplate.title,
      body: missedTemplate.body,
      url: missedTemplate.url,
      metadata: {
        expectedPeriodDate: nextPeriodDateStr,
      },
    })
  }

  return {
    eligible: true,
    candidates,
    calculatedCycleLength: cycleLength,
    estimatedNextPeriodDate: nextPeriodDateStr,
    estimatedOvulationDate: ovulationDateStr,
    estimatedFertileStartDate: fertileStartDateStr,
  }
}
