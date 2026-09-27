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

export type AffinityDisplayFormat =
  | "detailed"
  | "years_months"
  | "months_days"
  | "weeks_days"
  | "total_days"

export const AFFINITY_DISPLAY_FORMATS: readonly {
  id: AffinityDisplayFormat
  label: string
  description: string
}[] = [
  {
    id: "detailed",
    label: "Detailed",
    description: "Years, months, and days composite breakdown",
  },
  {
    id: "years_months",
    label: "Years & Months",
    description: "Years and months with minimal day noise",
  },
  {
    id: "months_days",
    label: "Months & Days",
    description: "Total elapsed months plus days",
  },
  {
    id: "weeks_days",
    label: "Weeks & Days",
    description: "Total elapsed weeks plus remaining days",
  },
  {
    id: "total_days",
    label: "Total Days",
    description: "Pure cumulative day count",
  },
] as const

export interface PartnerRelationship {
  id: string
  owner_user_id: string
  supporter_user_id: string | null
  status: PartnerRelationshipStatus
  relationship_start_date?: string | null
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
  manage_cycle_preferences: boolean
  manage_period_status: boolean
  manage_daily_notes: boolean
  created_at: string
  updated_at: string
}

export interface PartnerSharingPreferencesInput {
  cycle_estimates?: boolean
  period_status?: boolean
  cycle_preferences?: boolean
  daily_notes?: boolean
  manage_cycle_preferences?: boolean
  manage_period_status?: boolean
  manage_daily_notes?: boolean
}

export interface PartnerInvitation {
  id: string
  relationship_id: string
  inviter_user_id: string
  invitee_user_id?: string | null
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
  manage_cycle_preferences: false,
  manage_period_status: false,
  manage_daily_notes: false,
} as const

/**
 * Invitation expiration window: strictly 7 days.
 */
export const INVITATION_EXPIRATION_DAYS = 7
export const INVITATION_EXPIRATION_MS = INVITATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000

export interface PartnerSearchResult {
  username: string
  displayName: string
}

export interface CreateInvitationResult {
  rawToken: string
  invitation: PartnerInvitation
  relationship: PartnerRelationship
  invitee?: {
    username: string
    displayName: string
  }
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
    username: string | null
  }
  invitee?: {
    username: string | null
  }
  isTargetRecipient?: boolean
  isCurrentUserInviter?: boolean
  error?: string
}

export type PartnerConnectionUIStatus =
  | "none"
  | "outgoing_pending"
  | "incoming_pending"
  | "active"

export interface PartnerConnectionState {
  status: PartnerConnectionUIStatus
  partner?: {
    username: string
    displayName: string
  }
  relationship?: {
    id: string
    status: PartnerRelationshipStatus
    role: "owner" | "supporter"
    createdAt: string
    acceptedAt: string | null
    startDate?: string | null
  }
  affinityDisplayFormat?: AffinityDisplayFormat
  outgoingInvitation?: {
    id: string
    expiresAt: string
    createdAt: string
    rawToken?: string
    inviteeUsername?: string
    inviteeDisplayName?: string
  }
  incomingInvitation?: {
    id: string
    expiresAt: string
    createdAt: string
    inviterUsername: string
    inviterDisplayName: string
    tokenHash: string
  }
}

export interface RelationshipDurationResult {
  years: number
  months: number
  days: number
  totalDays: number
  totalWeeks: number
  remainingDaysAfterWeeks: number
  totalMonths: number
  formattedText: string
  primaryLabel: string
  secondaryLabel?: string
  isToday: boolean
  isFuture: boolean
}

export interface PartnerActionResult<T = undefined> {
  ok: boolean
  data?: T
  error?: string
}

