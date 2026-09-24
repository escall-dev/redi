"use server"

import { createClient } from "@/lib/supabase/server"
import { getEnabledSharingCategories } from "@/lib/partner/authorization"
import type { SharingCategory, PartnerRole, AuthorizationDenialReason } from "@/lib/partner/authorization"
import {
  getSharedCycleEstimates,
  getSharedPeriodStatus,
  getSharedCyclePreferences,
  getSharedDailyNotes,
  type SharedCycleEstimate,
  type SharedPeriodStatus,
  type SharedCyclePreferences,
  type SharedDailyNote,
} from "@/lib/partner/shared-data"

/**
 * Seijun Phase 19 Batch 3 — Server Actions for Partner Shared Data
 *
 * All actions derive the authenticated user from the Supabase session.
 * No client-supplied user IDs are trusted.
 * Each action independently authorizes access to its specific category.
 */

// ─── Dashboard Summary ──────────────────────────────────────────────────────

export interface PartnerDashboardData {
  authorized: boolean
  role?: PartnerRole
  enabledCategories?: SharingCategory[]
  ownerDisplayName?: string
  ownerUsername?: string
  reason?: AuthorizationDenialReason
  message?: string
}

/**
 * Server Action: Get partner dashboard metadata.
 * Returns enabled sharing categories and minimal partner identity.
 * Does NOT return shared data — each category is fetched independently.
 */
export async function getPartnerDashboardAction(): Promise<PartnerDashboardData> {
  const supabase = await createClient()
  return getEnabledSharingCategories(supabase)
}

// ─── Cycle Estimates ─────────────────────────────────────────────────────────

export interface SharedCycleEstimateResult {
  ok: boolean
  data?: SharedCycleEstimate
  reason?: AuthorizationDenialReason
  message?: string
}

/**
 * Server Action: Get shared cycle estimates for supporter.
 * Independently authorized — requires cycle_estimates=true.
 */
export async function getSharedCycleEstimatesAction(): Promise<SharedCycleEstimateResult> {
  const supabase = await createClient()
  return getSharedCycleEstimates(supabase)
}

// ─── Period Status ───────────────────────────────────────────────────────────

export interface SharedPeriodStatusResult {
  ok: boolean
  data?: SharedPeriodStatus
  reason?: AuthorizationDenialReason
  message?: string
}

/**
 * Server Action: Get shared period status for supporter.
 * Independently authorized — requires period_status=true.
 * Does NOT require cycle_estimates to be enabled.
 */
export async function getSharedPeriodStatusAction(): Promise<SharedPeriodStatusResult> {
  const supabase = await createClient()
  return getSharedPeriodStatus(supabase)
}

// ─── Cycle Preferences ──────────────────────────────────────────────────────

export interface SharedCyclePreferencesResult {
  ok: boolean
  data?: SharedCyclePreferences
  reason?: AuthorizationDenialReason
  message?: string
}

/**
 * Server Action: Get shared cycle preferences for supporter.
 * Independently authorized — requires cycle_preferences=true.
 * Supporter is READ-ONLY.
 */
export async function getSharedCyclePreferencesAction(): Promise<SharedCyclePreferencesResult> {
  const supabase = await createClient()
  return getSharedCyclePreferences(supabase)
}

// ─── Daily Notes ─────────────────────────────────────────────────────────────

export interface SharedDailyNotesResult {
  ok: boolean
  data?: SharedDailyNote[]
  reason?: AuthorizationDenialReason
  message?: string
}

/**
 * Server Action: Get shared daily notes for supporter.
 * Independently authorized — requires daily_notes=true.
 * Supporter can VIEW but CANNOT create, edit, or delete.
 */
export async function getSharedDailyNotesAction(): Promise<SharedDailyNotesResult> {
  const supabase = await createClient()
  return getSharedDailyNotes(supabase)
}
