/**
 * Seijun Phase 19: Partner Connection Foundation Type Definitions
 *
 * Establishes core data models for 1:1 partner relationships,
 * privacy-first sharing preferences, and cryptographic invitation tokens.
 */

export type PartnerRelationshipStatus =
  | "pending"
  | "active"
  | "revoked"
  | "declined"
  | "expired"

export type PartnerInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled"

export interface PartnerRelationship {
  id: string
  owner_user_id: string
  supporter_user_id: string | null
  status: PartnerRelationshipStatus
  created_at: string
  accepted_at: string | null
  revoked_at: string | null
  updated_at: string
}

export interface PartnerSharingPreferences {
  id: string
  relationship_id: string
  owner_user_id: string
  cycle_estimates: boolean
  period_status: boolean
  cycle_preferences: boolean
  daily_notes: boolean
  created_at: string
  updated_at: string
}

export interface PartnerSharingPreferencesInput {
  cycle_estimates?: boolean
  period_status?: boolean
  cycle_preferences?: boolean
  daily_notes?: boolean
}

export interface PartnerInvitation {
  id: string
  relationship_id: string
  inviter_user_id: string
  token_hash: string
  expires_at: string
  status: PartnerInvitationStatus
  created_at: string
  accepted_at: string | null
  declined_at: string | null
  cancelled_at: string | null
  updated_at: string
}

/**
 * Standard conservative privacy-first sharing preference defaults.
 * All sensitive cycle and note categories are disabled by default until
 * the cycle tracker explicitly chooses to toggle them on.
 */
export const DEFAULT_PARTNER_SHARING_PREFERENCES: Readonly<PartnerSharingPreferencesInput> = {
  cycle_estimates: false,
  period_status: false,
  cycle_preferences: false,
  daily_notes: false,
} as const

/**
 * Invitation expiration window: strictly 7 days.
 */
export const INVITATION_EXPIRATION_DAYS = 7
export const INVITATION_EXPIRATION_MS = INVITATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000

export interface CreateInvitationResult {
  rawToken: string
  invitation: PartnerInvitation
  relationship: PartnerRelationship
}

export interface VerifyInvitationResult {
  valid: boolean
  invitation?: {
    id: string
    relationship_id: string
    expires_at: string
    status: PartnerInvitationStatus
    created_at: string
  }
  inviter?: {
    displayName: string | null
  }
  error?: string
}

export interface PartnerActionResult<T = undefined> {
  ok: boolean
  data?: T
  error?: string
}
