/**
 * Seijun Phase 19.1: Centralized Cycle Context Type Definitions
 *
 * Establishes a single source of truth for determining whose cycle the application
 * is currently operating on (OWN vs PARTNER).
 *
 * Rules:
 *  - cycle_tracker: Primary context is always OWN.
 *  - supporter: Primary context is CONNECTED PARTNER's cycle when an active relationship exists.
 *  - both: Dual capability; user can explicitly switch between OWN and PARTNER context.
 */

import type { SharingCategory, CoManagementPermission } from "@/lib/partner/authorization"

export type CycleContextMode = "own" | "partner"

export const CYCLE_CONTEXT_COOKIE_NAME = "seijun_cycle_context"

export interface CyclePartnerInfo {
  partnerUserId: string | null
  displayName: string | null
  username: string | null
  relationshipId: string | null
  hasActivePartner: boolean
  isSupporter: boolean
  isOwner: boolean
}

export interface CyclePermissions {
  enabledCategories: SharingCategory[]
  managementPermissions: CoManagementPermission[]
  canManagePeriod: boolean
  canManageCyclePrefs: boolean
  canManageDailyNotes: boolean
  hasCycleEstimates: boolean
  hasPeriodStatus: boolean
  hasDailyNotes: boolean
  hasCyclePreferences: boolean
}

export interface CycleContextState {
  /** Current active mode: 'own' or 'partner' */
  mode: CycleContextMode
  /** Convenience flag: true when mode is 'partner' */
  isPartnerContext: boolean
  /** Convenience flag: true when mode is 'own' */
  isOwnContext: boolean
  /** The effective user ID whose cycle data is currently being viewed/targeted */
  activeUserId: string
  /** The authenticated user's ID */
  currentUserId: string
  /** The authenticated user's profile usage role */
  usageRole: "cycle_tracker" | "supporter" | "both" | null
  /** Information about the connected partner (if any) */
  partnerInfo: CyclePartnerInfo
  /** Sharing categories and co-management capabilities */
  permissions: CyclePermissions
  /** Whether the user has dual roles and can switch context ('both' with active partner) */
  canSwitchContext: boolean
}
