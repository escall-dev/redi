import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import {
  type PartnerRelationship,
  type PartnerSharingPreferences,
  type PartnerSharingPreferencesInput,
  type PartnerInvitation,
  type CreateInvitationResult,
  type VerifyInvitationResult,
  type PartnerActionResult,
  DEFAULT_PARTNER_SHARING_PREFERENCES,
} from "./types"
import {
  generateInvitationToken,
  hashInvitationToken,
  calculateInvitationExpiry,
  isInvitationExpired,
} from "./token"

/**
 * Service: Creates a new 1:1 partner invitation for an owner.
 *
 * Enforces:
 * 1. Inviter cannot have an existing active relationship (1:1 rule).
 * 2. Inviter cannot have an existing non-expired pending invitation.
 * 3. Atomic creation of pending relationship and single-use invitation record.
 * 4. Raw token is generated and returned, but ONLY the SHA-256 hash is persisted.
 */
export async function createPartnerInvitation(
  supabase: SupabaseClient<Database>,
  inviterUserId: string
): Promise<PartnerActionResult<CreateInvitationResult>> {
  try {
    // 1. Check if inviter already has an active relationship as owner or supporter
    const { data: existingActive, error: activeError } = await supabase
      .from("partner_relationships")
      .select("id, status, owner_user_id, supporter_user_id")
      .or(`owner_user_id.eq.${inviterUserId},supporter_user_id.eq.${inviterUserId}`)
      .eq("status", "active")
      .maybeSingle()

    if (activeError) {
      return { ok: false, error: "Database error checking active relationship status." }
    }

    if (existingActive) {
      return {
        ok: false,
        error: "You already have an active partner connection. Seijun supports 1:1 partner connections only.",
      }
    }

    // 2. Check if inviter already has a pending invitation
    const { data: existingPending, error: pendingError } = await supabase
      .from("partner_invitations")
      .select("id, relationship_id, expires_at, status")
      .eq("inviter_user_id", inviterUserId)
      .eq("status", "pending")
      .maybeSingle()

    if (pendingError) {
      return { ok: false, error: "Database error checking pending invitation status." }
    }

    if (existingPending) {
      // Check if it's expired
      if (isInvitationExpired(existingPending.expires_at)) {
        // Mark as expired so the user can generate a fresh one
        await supabase
          .from("partner_invitations")
          .update({ status: "expired" })
          .eq("id", existingPending.id)

        await supabase
          .from("partner_relationships")
          .update({ status: "expired" })
          .eq("id", existingPending.relationship_id)
      } else {
        return {
          ok: false,
          error: "You already have a pending partner invitation. Please wait for your partner to accept it or cancel it first.",
        }
      }
    }

    // 3. Create relationship record in 'pending' state
    const { data: relationship, error: relError } = await supabase
      .from("partner_relationships")
      .insert({
        owner_user_id: inviterUserId,
        supporter_user_id: null,
        status: "pending",
      })
      .select()
      .single()

    if (relError || !relationship) {
      return { ok: false, error: "Failed to create partner relationship record." }
    }

    // 4. Generate cryptographically secure token & hash
    const rawToken = generateInvitationToken()
    const tokenHash = hashInvitationToken(rawToken)
    const expiresAt = calculateInvitationExpiry().toISOString()

    // 5. Insert invitation record with token_hash (NEVER rawToken)
    const { data: invitation, error: invError } = await supabase
      .from("partner_invitations")
      .insert({
        relationship_id: relationship.id,
        inviter_user_id: inviterUserId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        status: "pending",
      })
      .select()
      .single()

    if (invError || !invitation) {
      // Clean up orphaned relationship if invitation creation failed
      await supabase.from("partner_relationships").delete().eq("id", relationship.id)
      return { ok: false, error: "Failed to create partner invitation record." }
    }

    return {
      ok: true,
      data: {
        rawToken,
        invitation: invitation as PartnerInvitation,
        relationship: relationship as PartnerRelationship,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error creating invitation."
    return { ok: false, error: message }
  }
}

/**
 * Service: Verifies an invitation token without consuming it.
 * Used when recipient opens an invitation link to preview before accepting.
 */
export async function verifyInvitation(
  supabase: SupabaseClient<Database>,
  rawToken: string
): Promise<VerifyInvitationResult> {
  try {
    if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length === 0) {
      return { valid: false, error: "No invitation token provided." }
    }

    const tokenHash = hashInvitationToken(rawToken.trim())

    const { data: invitation, error: invError } = await supabase
      .from("partner_invitations")
      .select("id, relationship_id, inviter_user_id, expires_at, status, created_at")
      .eq("token_hash", tokenHash)
      .maybeSingle()

    if (invError || !invitation) {
      return { valid: false, error: "Invitation not found or invalid token." }
    }

    if (invitation.status !== "pending") {
      if (invitation.status === "accepted") {
        return { valid: false, error: "This invitation has already been accepted." }
      }
      if (invitation.status === "cancelled") {
        return { valid: false, error: "This invitation was cancelled by the sender." }
      }
      if (invitation.status === "declined") {
        return { valid: false, error: "This invitation was declined." }
      }
      return { valid: false, error: "This invitation is no longer active." }
    }

    // Check expiration
    if (isInvitationExpired(invitation.expires_at)) {
      // Mark as expired in DB
      await supabase
        .from("partner_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id)

      await supabase
        .from("partner_relationships")
        .update({ status: "expired" })
        .eq("id", invitation.relationship_id)
        .eq("status", "pending")

      return { valid: false, error: "This invitation has expired (valid for 7 days)." }
    }

    // Retrieve inviter display name for safe preview (never expose email or private data)
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", invitation.inviter_user_id)
      .maybeSingle()

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        relationship_id: invitation.relationship_id,
        expires_at: invitation.expires_at,
        status: invitation.status,
        created_at: invitation.created_at,
      },
      inviter: {
        displayName: profile?.display_name || "Seijun User",
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error verifying invitation."
    return { valid: false, error: message }
  }
}

/**
 * Service: Accepts a partner invitation.
 *
 * Enforces:
 * 1. Single-use: Fails if already accepted or not pending.
 * 2. Expiration: Fails if expired.
 * 3. Self-acceptance prevention: Inviter cannot accept their own invitation.
 * 4. 1:1 rule: Accepter cannot already have an active relationship.
 * 5. Atomic state transition to active and single-use invalidation.
 */
export async function acceptInvitation(
  supabase: SupabaseClient<Database>,
  rawToken: string,
  acceptingUserId: string
): Promise<PartnerActionResult<{ relationshipId: string }>> {
  try {
    if (!rawToken || !acceptingUserId) {
      return { ok: false, error: "Invalid invitation acceptance parameters." }
    }

    const tokenHash = hashInvitationToken(rawToken.trim())

    const { data: invitation, error: invError } = await supabase
      .from("partner_invitations")
      .select("id, relationship_id, inviter_user_id, expires_at, status")
      .eq("token_hash", tokenHash)
      .maybeSingle()

    if (invError || !invitation) {
      return { ok: false, error: "Invitation not found or invalid token." }
    }

    // Single-use guard: only 'pending' can be accepted
    if (invitation.status !== "pending") {
      if (invitation.status === "accepted") {
        return { ok: false, error: "This invitation has already been accepted and cannot be reused." }
      }
      return { ok: false, error: `Invitation cannot be accepted because it is ${invitation.status}.` }
    }

    // Expiration check
    if (isInvitationExpired(invitation.expires_at)) {
      await supabase
        .from("partner_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id)

      await supabase
        .from("partner_relationships")
        .update({ status: "expired" })
        .eq("id", invitation.relationship_id)
        .eq("status", "pending")

      return { ok: false, error: "This invitation has expired." }
    }

    // Prevent accepting own invitation
    if (invitation.inviter_user_id === acceptingUserId) {
      return { ok: false, error: "You cannot accept your own invitation." }
    }

    // Check if accepting user already has an active relationship
    const { data: accepterActive, error: activeErr } = await supabase
      .from("partner_relationships")
      .select("id")
      .or(`owner_user_id.eq.${acceptingUserId},supporter_user_id.eq.${acceptingUserId}`)
      .eq("status", "active")
      .maybeSingle()

    if (activeErr) {
      return { ok: false, error: "Database error checking partner connection status." }
    }

    if (accepterActive) {
      return {
        ok: false,
        error: "You already have an active partner connection. 1:1 model allows only one active connection.",
      }
    }

    // Check if inviter already has an active relationship (race protection)
    const { data: inviterActive, error: inviterActiveErr } = await supabase
      .from("partner_relationships")
      .select("id")
      .or(`owner_user_id.eq.${invitation.inviter_user_id},supporter_user_id.eq.${invitation.inviter_user_id}`)
      .eq("status", "active")
      .maybeSingle()

    if (inviterActiveErr) {
      return { ok: false, error: "Database error checking inviter connection status." }
    }

    if (inviterActive) {
      return {
        ok: false,
        error: "The invitation sender already has an active partner connection.",
      }
    }

    const now = new Date().toISOString()

    // 1. Transition relationship to active
    const { error: relUpdateError } = await supabase
      .from("partner_relationships")
      .update({
        supporter_user_id: acceptingUserId,
        status: "active",
        accepted_at: now,
      })
      .eq("id", invitation.relationship_id)
      .eq("status", "pending")

    if (relUpdateError) {
      return { ok: false, error: "Failed to activate partner relationship." }
    }

    // 2. Transition invitation to accepted (prevents reuse)
    const { error: invUpdateError } = await supabase
      .from("partner_invitations")
      .update({
        status: "accepted",
        accepted_at: now,
      })
      .eq("id", invitation.id)
      .eq("status", "pending")

    if (invUpdateError) {
      return { ok: false, error: "Failed to update invitation status to accepted." }
    }

    return {
      ok: true,
      data: { relationshipId: invitation.relationship_id },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error accepting invitation."
    return { ok: false, error: message }
  }
}

/**
 * Service: Declines a pending invitation.
 */
export async function declineInvitation(
  supabase: SupabaseClient<Database>,
  rawToken: string,
  decliningUserId: string
): Promise<PartnerActionResult> {
  try {
    if (!rawToken) {
      return { ok: false, error: "No invitation token provided." }
    }

    const tokenHash = hashInvitationToken(rawToken.trim())

    const { data: invitation, error: invError } = await supabase
      .from("partner_invitations")
      .select("id, relationship_id, inviter_user_id, status")
      .eq("token_hash", tokenHash)
      .maybeSingle()

    if (invError || !invitation) {
      return { ok: false, error: "Invitation not found." }
    }

    if (invitation.status !== "pending") {
      return { ok: false, error: `Invitation cannot be declined because it is ${invitation.status}.` }
    }

    if (invitation.inviter_user_id === decliningUserId) {
      return { ok: false, error: "You cannot decline your own invitation. Use cancel instead." }
    }

    const now = new Date().toISOString()

    await supabase
      .from("partner_invitations")
      .update({
        status: "declined",
        declined_at: now,
      })
      .eq("id", invitation.id)

    await supabase
      .from("partner_relationships")
      .update({
        status: "declined",
      })
      .eq("id", invitation.relationship_id)

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error declining invitation."
    return { ok: false, error: message }
  }
}

/**
 * Service: Cancels a pending invitation by the inviter.
 */
export async function cancelInvitation(
  supabase: SupabaseClient<Database>,
  inviterUserId: string,
  invitationId: string
): Promise<PartnerActionResult> {
  try {
    const { data: invitation, error: invError } = await supabase
      .from("partner_invitations")
      .select("id, relationship_id, inviter_user_id, status")
      .eq("id", invitationId)
      .eq("inviter_user_id", inviterUserId)
      .maybeSingle()

    if (invError || !invitation) {
      return { ok: false, error: "Invitation not found or unauthorized." }
    }

    if (invitation.status !== "pending") {
      return { ok: false, error: "Only pending invitations can be cancelled." }
    }

    const now = new Date().toISOString()

    await supabase
      .from("partner_invitations")
      .update({
        status: "cancelled",
        cancelled_at: now,
      })
      .eq("id", invitation.id)

    await supabase
      .from("partner_relationships")
      .update({
        status: "revoked",
        revoked_at: now,
      })
      .eq("id", invitation.relationship_id)

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error cancelling invitation."
    return { ok: false, error: message }
  }
}

/**
 * Service: Revokes an active partner relationship.
 * Either the owner or the supporter may revoke the relationship at any time.
 */
export async function revokeRelationship(
  supabase: SupabaseClient<Database>,
  userId: string,
  relationshipId: string
): Promise<PartnerActionResult> {
  try {
    const { data: relationship, error: relError } = await supabase
      .from("partner_relationships")
      .select("id, owner_user_id, supporter_user_id, status")
      .eq("id", relationshipId)
      .or(`owner_user_id.eq.${userId},supporter_user_id.eq.${userId}`)
      .maybeSingle()

    if (relError || !relationship) {
      return { ok: false, error: "Relationship not found or unauthorized." }
    }

    if (relationship.status !== "active") {
      return { ok: false, error: "Only active relationships can be revoked." }
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from("partner_relationships")
      .update({
        status: "revoked",
        revoked_at: now,
      })
      .eq("id", relationship.id)

    if (updateError) {
      return { ok: false, error: "Failed to revoke partner relationship." }
    }

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error revoking relationship."
    return { ok: false, error: message }
  }
}

/**
 * Service: Retrieves current active or pending relationship for a user.
 */
export async function getPartnerRelationship(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PartnerRelationship | null> {
  try {
    const { data, error } = await supabase
      .from("partner_relationships")
      .select("*")
      .or(`owner_user_id.eq.${userId},supporter_user_id.eq.${userId}`)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return data as PartnerRelationship
  } catch {
    return null
  }
}

/**
 * Service: Retrieves sharing preferences for a relationship.
 * Accessible by owner, or by supporter ONLY IF relationship is active.
 */
export async function getSharingPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
  relationshipId: string
): Promise<PartnerActionResult<PartnerSharingPreferences>> {
  try {
    // 1. Verify access authorization
    const { data: relationship, error: relError } = await supabase
      .from("partner_relationships")
      .select("id, owner_user_id, supporter_user_id, status")
      .eq("id", relationshipId)
      .maybeSingle()

    if (relError || !relationship) {
      return { ok: false, error: "Relationship not found." }
    }

    const isOwner = relationship.owner_user_id === userId
    const isSupporter = relationship.supporter_user_id === userId && relationship.status === "active"

    if (!isOwner && !isSupporter) {
      return { ok: false, error: "Unauthorized access to partner sharing preferences." }
    }

    // 2. Fetch preferences
    const { data: prefs, error: prefsError } = await supabase
      .from("partner_sharing_preferences")
      .select("*")
      .eq("relationship_id", relationshipId)
      .maybeSingle()

    if (prefsError) {
      return { ok: false, error: "Failed to load sharing preferences." }
    }

    if (!prefs) {
      // Conservative default if row does not exist yet
      return {
        ok: true,
        data: {
          id: "",
          relationship_id: relationshipId,
          owner_user_id: relationship.owner_user_id,
          cycle_estimates: DEFAULT_PARTNER_SHARING_PREFERENCES.cycle_estimates ?? false,
          period_status: DEFAULT_PARTNER_SHARING_PREFERENCES.period_status ?? false,
          cycle_preferences: DEFAULT_PARTNER_SHARING_PREFERENCES.cycle_preferences ?? false,
          daily_notes: DEFAULT_PARTNER_SHARING_PREFERENCES.daily_notes ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }
    }

    return {
      ok: true,
      data: prefs as PartnerSharingPreferences,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error loading sharing preferences."
    return { ok: false, error: message }
  }
}

/**
 * Service: Updates sharing preferences for a relationship.
 * OWNER ONLY: Supporters CANNOT update sharing preferences.
 */
export async function updateSharingPreferences(
  supabase: SupabaseClient<Database>,
  ownerUserId: string,
  relationshipId: string,
  updates: PartnerSharingPreferencesInput
): Promise<PartnerActionResult<PartnerSharingPreferences>> {
  try {
    // 1. Verify user is strictly the owner of the relationship
    const { data: relationship, error: relError } = await supabase
      .from("partner_relationships")
      .select("id, owner_user_id")
      .eq("id", relationshipId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle()

    if (relError || !relationship) {
      return {
        ok: false,
        error: "Unauthorized: Only the cycle data owner can modify sharing preferences.",
      }
    }

    // 2. Sanitize updates to strictly known boolean flags
    const sanitized: Partial<Database["public"]["Tables"]["partner_sharing_preferences"]["Update"]> = {}
    if (typeof updates.cycle_estimates === "boolean") sanitized.cycle_estimates = updates.cycle_estimates
    if (typeof updates.period_status === "boolean") sanitized.period_status = updates.period_status
    if (typeof updates.cycle_preferences === "boolean") sanitized.cycle_preferences = updates.cycle_preferences
    if (typeof updates.daily_notes === "boolean") sanitized.daily_notes = updates.daily_notes

    // 3. Upsert sharing preferences record
    const { data: updated, error: updateError } = await supabase
      .from("partner_sharing_preferences")
      .upsert(
        {
          relationship_id: relationshipId,
          owner_user_id: ownerUserId,
          ...sanitized,
        },
        { onConflict: "relationship_id" }
      )
      .select()
      .single()

    if (updateError || !updated) {
      return { ok: false, error: "Failed to update sharing preferences in database." }
    }

    return {
      ok: true,
      data: updated as PartnerSharingPreferences,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating sharing preferences."
    return { ok: false, error: message }
  }
}
