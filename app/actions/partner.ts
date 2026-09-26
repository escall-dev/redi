"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  createPartnerInvitation,
  verifyInvitation,
  acceptInvitation,
  acceptInvitationById,
  declineInvitation,
  declineInvitationById,
  cancelInvitation,
  revokeRelationship,
  getPartnerRelationship,
  getSharingPreferences,
  updateSharingPreferences,
  searchPartnerByUsername,
  getPartnerConnectionState,
} from "@/lib/partner/service"
import type {
  CreateInvitationResult,
  VerifyInvitationResult,
  PartnerRelationship,
  PartnerSharingPreferences,
  PartnerSharingPreferencesInput,
  PartnerActionResult,
  PartnerSearchResult,
  PartnerConnectionState,
} from "@/lib/partner/types"

/**
 * Server Action: Searches for an eligible partner by username.
 * Requires authenticated session. Excludes current user. Returns minimal public data.
 */
export async function searchPartnerByUsernameAction(
  query: string
): Promise<PartnerActionResult<PartnerSearchResult[]>> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required to search partner accounts." }
  }

  return searchPartnerByUsername(supabase, user.id, query)
}

/**
 * Server Action: Creates a new partner invitation.
 * Derives inviter user ID strictly from the authenticated Supabase session.
 * Optionally binds the invitation to an intended target username.
 */
export async function createPartnerInvitationAction(
  targetUsername?: string
): Promise<PartnerActionResult<CreateInvitationResult>> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required to create partner invitation." }
  }

  return createPartnerInvitation(supabase, user.id, targetUsername)
}

/**
 * Server Action: Verifies an invitation token preview without accepting it.
 */
export async function verifyPartnerInvitationAction(
  rawToken: string
): Promise<VerifyInvitationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return verifyInvitation(supabase, rawToken, user?.id)
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

  const res = await acceptInvitation(supabase, rawToken, user.id)
  if (res.ok) {
    revalidatePath("/settings/partner")
    revalidatePath("/dashboard")
    revalidatePath("/partner")
    revalidatePath("/notifications")
  }
  return res
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

  const res = await declineInvitation(supabase, rawToken, user.id)
  if (res.ok) {
    revalidatePath("/settings/partner")
    revalidatePath("/dashboard")
    revalidatePath("/partner")
    revalidatePath("/notifications")
  }
  return res
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

  const res = await cancelInvitation(supabase, user.id, invitationId)
  if (res.ok) {
    revalidatePath("/settings/partner")
    revalidatePath("/dashboard")
    revalidatePath("/partner")
    revalidatePath("/notifications")
  }
  return res
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

  const res = await revokeRelationship(supabase, user.id, relationshipId)
  if (res.ok) {
    revalidatePath("/settings/partner")
    revalidatePath("/dashboard")
    revalidatePath("/partner")
    revalidatePath("/notifications")
  }
  return res
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

/**
 * Server Action: Accepts a partner invitation directly by invitation ID (for in-app UI).
 */
export async function acceptPartnerInvitationByIdAction(
  invitationId: string
): Promise<PartnerActionResult<{ relationshipId: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required to accept partner invitation." }
  }

  const res = await acceptInvitationById(supabase, invitationId, user.id)
  if (res.ok) {
    revalidatePath("/settings/partner")
    revalidatePath("/dashboard")
    revalidatePath("/partner")
    revalidatePath("/notifications")
  }
  return res
}

/**
 * Server Action: Declines a partner invitation directly by invitation ID (for in-app UI).
 */
export async function declinePartnerInvitationByIdAction(
  invitationId: string
): Promise<PartnerActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required to decline partner invitation." }
  }

  const res = await declineInvitationById(supabase, invitationId, user.id)
  if (res.ok) {
    revalidatePath("/settings/partner")
    revalidatePath("/dashboard")
    revalidatePath("/partner")
    revalidatePath("/notifications")
  }
  return res
}

/**
 * Server Action: Gets the consolidated partner connection state for UI rendering.
 */
export async function getPartnerConnectionStateAction(): Promise<
  PartnerActionResult<PartnerConnectionState>
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Authentication required." }
  }

  return getPartnerConnectionState(supabase, user.id)
}

