/**
 * Seijun Phase 18: Smart Cycle Reminder Engine Types
 */

import type { CycleReminderType, NotificationEventStatus, Json } from "@/lib/supabase/types"
import type { ReminderTimingOption, NotificationPreferences } from "@/lib/notifications/types"
import type { CycleRecord } from "@/app/actions/cycles"
import type { ProfileUsageRole } from "@/lib/supabase/types"

export type { CycleReminderType, NotificationEventStatus, ReminderTimingOption, Json }

export interface ReminderCandidate {
  type: CycleReminderType
  scheduled_for: string // YYYY-MM-DD
  cycle_id: string | null
  title: string
  body: string
  url: string
  metadata?: Json
}

export interface EngineUserProfile {
  id: string
  usage_role: ProfileUsageRole | null
  typical_cycle_length: number | null
  last_period_start: string | null
  onboarding_completed?: boolean
}

export interface ReminderEngineParams {
  profile: EngineUserProfile
  cycles: CycleRecord[]
  preferences: NotificationPreferences
  referenceDateStr?: string // YYYY-MM-DD, defaults to today
}

export interface ReminderEngineResult {
  eligible: boolean
  reason?: string
  candidates: ReminderCandidate[]
  calculatedCycleLength: number | null
  estimatedNextPeriodDate: string | null
  estimatedOvulationDate: string | null
  estimatedFertileStartDate: string | null
}
