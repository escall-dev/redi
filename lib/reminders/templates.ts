/**
 * Seijun Phase 18: Notification Content & Template Generator
 *
 * Provides concise, non-stigmatizing notification copy and click destinations.
 * Invariants:
 * - Free of unnecessarily sensitive health data in payloads
 * - Click destinations route to appropriate same-origin Seijun pages
 */

import type { CycleReminderType } from "./types"

export interface NotificationTemplate {
  title: string
  body: string
  url: string
}

export function getReminderTemplate(
  type: CycleReminderType,
  context?: {
    daysBefore?: number
    phaseName?: string
  }
): NotificationTemplate {
  switch (type) {
    case "period_upcoming": {
      const days = context?.daysBefore ?? 3
      const dayText = days === 1 ? "tomorrow" : `in ${days} days`
      return {
        title: "Your period may start soon",
        body: `Your estimated period starts ${dayText}.`,
        url: "/dashboard",
      }
    }

    case "period_expected":
      return {
        title: "Your period is expected today",
        body: "Your estimated period is expected to start today.",
        url: "/dashboard",
      }

    case "fertile_window":
      return {
        title: "Fertile window approaching",
        body: "Your estimated fertile window starts tomorrow.",
        url: "/calendar",
      }

    case "ovulation":
      return {
        title: "Estimated ovulation day",
        body: "Today is your estimated ovulation day.",
        url: "/calendar",
      }

    case "cycle_transition": {
      const phase = context?.phaseName || "the next phase"
      return {
        title: "New cycle phase",
        body: `You are entering ${phase} of your cycle.`,
        url: "/dashboard",
      }
    }

    case "missed_period":
      return {
        title: "Period update",
        body: "Your period is later than expected. Log your period or symptoms when you're ready.",
        url: "/cycles",
      }

    default:
      return {
        title: "Seijun Cycle Update",
        body: "You have a new cycle update available in Seijun.",
        url: "/dashboard",
      }
  }
}
