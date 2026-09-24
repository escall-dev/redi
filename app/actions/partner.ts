"use server"

import { createClient } from "@/lib/supabase/server"
import {
  createPartnerInvitation,
  verifyInvitation,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  revokeRelationship,
  getPartnerRelationship,
  getSharingPreferences,
  updateSharingPreferences,
} from "@/lib/partner/service"
import type {
  CreateInvitationResult,
  VerifyInvitationResult,
  PartnerRelationship,
  PartnerSharingPreferences,
  PartnerSharingPreferencesInput,
  PartnerActionResult,
} from "@/lib/partner/types"

/**
 * Server Action: Creates a new partner invitation.
 * Derives inviter user ID strictly from the authenticated Supabase session.
 */
export async function createPartnerInvitationAction(): Promise<
  PartnerActionResult<CreateInvitationResult>
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required to create partner invitation." }
  }

  return createPartnerInvitation(supabase, user.id)
}

/**
 * Server Action: Verifies an invitation token preview without accepting it.
 */
export async function verifyPartnerInvitationAction(
  rawToken: string
): Promise<VerifyInvitationResult> {
  const supabase = await createClient()
  return verifyInvitation(supabase, rawToken)
}

/**
 * Server Action: Accepts a partner invitation.
 * Derives accepting supporter user ID strictly from the authenticated Supabase session.
 */
export async function acceptPartnerInvitationAction(
  rawToken: string
): Promise<PartnerActionResult<{ relationshipId: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required to accept partner invitation." }
  }

  return acceptInvitation(supabase, rawToken, user.id)
}

/**
 * Server Action: Declines a pending partner invitation.
 */
export async function declinePartnerInvitationAction(
  rawToken: string
): Promise<PartnerActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required to decline partner invitation." }
  }

  return declineInvitation(supabase, rawToken, user.id)
}

/**
 * Server Action: Cancels a pending invitation by the inviter.
 */
export async function cancelPartnerInvitationAction(
  invitationId: string
): Promise<PartnerActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required to cancel partner invitation." }
  }

  return cancelInvitation(supabase, user.id, invitationId)
}

/**
 * Server Action: Revokes an active partner relationship.
 */
export async function revokePartnerRelationshipAction(
  relationshipId: string
): Promise<PartnerActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required to revoke partner relationship." }
  }

  return revokeRelationship(supabase, user.id, relationshipId)
}

/**
 * Server Action: Gets the current active or pending partner relationship for the authenticated user.
 */
export async function getPartnerRelationshipAction(): Promise<{
  ok: boolean
  relationship: PartnerRelationship | null
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, relationship: null, error: "Authentication required." }
  }

  const relationship = await getPartnerRelationship(supabase, user.id)
  return { ok: true, relationship }
}

/**
 * Server Action: Gets sharing preferences for a given relationship.
 */
export async function getPartnerSharingPreferencesAction(
  relationshipId: string
): Promise<PartnerActionResult<PartnerSharingPreferences>> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required." }
  }

  return getSharingPreferences(supabase, user.id, relationshipId)
}

/**
 * Server Action: Updates sharing preferences for a given relationship.
 * OWNER ONLY.
 */
export async function updatePartnerSharingPreferencesAction(
  relationshipId: string,
  updates: PartnerSharingPreferencesInput
): Promise<PartnerActionResult<PartnerSharingPreferences>> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required." }
  }

  return updateSharingPreferences(supabase, user.id, relationshipId, updates)
}
