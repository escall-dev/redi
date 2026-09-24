import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import {
  type PartnerRelationship,
  type PartnerRelationshipStatus,
  type PartnerSharingPreferences,
  type PartnerSharingPreferencesInput,
  type PartnerInvitation,
  type CreateInvitationResult,
  type VerifyInvitationResult,
  type PartnerActionResult,
  type PartnerSearchResult,
  type PartnerConnectionState,
  DEFAULT_PARTNER_SHARING_PREFERENCES,
} from "./types"
import {
  generateInvitationToken,
  hashInvitationToken,
  calculateInvitationExpiry,
  isInvitationExpired,
} from "./token"
import { sendPartnerInvitationNotification } from "./notification"

/**
 * Normalizes username input: strips leading '@', trims whitespace, lowercases.
 */
export function normalizeUsername(input: string): string {
  if (!input || typeof input !== "string") return ""
  return input.trim().replace(/^@+/, "").toLowerCase()
}

/**
 * Validates username format: 3 to 30 characters, lowercase letters, digits, and underscores only.
 */
export function isValidUsernameFormat(username: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(username)
}

/**
 * Service: Searches for an eligible partner by username.
 *
 * Privacy Guarantees:
 * - Requires authenticated user (rejects unauthenticated discovery).
 * - Excludes current user from search results.
 * - Returns ONLY minimal public identification: { username, displayName }.
 * - Strictly NEVER returns auth user ID, internal UUID, email, cycles, or notes.
 */
export async function searchPartnerByUsername(
  supabase: SupabaseClient<Database>,
  currentUserId: string,
  query: string
): Promise<PartnerActionResult<PartnerSearchResult[]>> {
  try {
    if (!currentUserId) {
      return { ok: false, error: "Authentication required to search partner accounts." }
    }

    const normalized = normalizeUsername(query)
    if (!normalized || normalized.length < 2) {
      return { ok: true, data: [] }
    }

    // Query profiles for public identification only (RPC or direct with fallback)
    let results: PartnerSearchResult[] = []

    const { data: rpcRows, error: rpcErr } = await supabase.rpc("search_partner_by_username", {
      p_query: normalized,
      p_current_user_id: currentUserId,
      p_limit: 5,
    })

    if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
      results = rpcRows.map((r) => ({
        username: r.username,
        displayName: r.display_name || r.username,
      }))
    } else {
      const { data: directRows, error: directErr } = await supabase
        .from("profiles")
        .select("username, display_name")
        .neq("user_id", currentUserId)
        .ilike("username", `${normalized}%`)
        .not("username", "is", null)
        .limit(5)

      if (directErr && !rpcRows) {
        return { ok: false, error: "Database error searching for user." }
      }

      results = (directRows || [])
        .filter((r): r is { username: string; display_name: string | null } => !!r.username)
        .map((r) => ({
          username: r.username,
          displayName: r.display_name || r.username,
        }))
    }

    return { ok: true, data: results }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error searching for user."
    return { ok: false, error: message }
  }
}

/**
 * Service: Creates a new 1:1 partner invitation for an owner.
 *
 * Enforces:
 * 1. Inviter cannot have an existing active relationship (1:1 rule).
 * 2. Inviter cannot have an existing non-expired pending invitation.
 * 3. Resolves and binds intended target recipient server-side if targetUsername is provided.
 * 4. Target recipient cannot be inviter themselves.
 * 5. Target recipient cannot already have an active or conflicting pending relationship.
 * 6. Atomic creation of pending relationship and single-use invitation record.
 * 7. Raw token is generated and returned, but ONLY the SHA-256 hash is persisted.
 */
export async function createPartnerInvitation(
  supabase: SupabaseClient<Database>,
  inviterUserId: string,
  targetUsername?: string
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

    // 3. Resolve and validate target recipient if username was provided
    let targetUserId: string | null = null
    let targetInfo: { username: string; displayName: string } | undefined = undefined

    if (targetUsername) {
      const normalizedTarget = normalizeUsername(targetUsername)
      if (!normalizedTarget || !isValidUsernameFormat(normalizedTarget)) {
        return { ok: false, error: "Invalid username format. Must be 3-30 characters (letters, numbers, underscores)." }
      }

      let resolvedTarget: { user_id: string; username: string | null; display_name: string | null } | null = null

      const { data: rpcTarget, error: rpcTargetErr } = await supabase.rpc("resolve_partner_by_username", {
        p_username: normalizedTarget,
      })

      if (!rpcTargetErr && Array.isArray(rpcTarget) && rpcTarget.length > 0) {
        resolvedTarget = rpcTarget[0]
      } else {
        const { data: directTarget, error: targetProfileErr } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .ilike("username", normalizedTarget)
          .maybeSingle()

        if (!targetProfileErr && directTarget) {
          resolvedTarget = directTarget
        }
      }

      if (!resolvedTarget) {
        return { ok: false, error: `User @${normalizedTarget} not found.` }
      }

      const targetProfile = resolvedTarget

      if (targetProfile.user_id === inviterUserId) {
        return { ok: false, error: "You cannot invite yourself as a partner." }
      }

      // Check if target already has an active relationship
      const { data: targetActive, error: targetActiveErr } = await supabase
        .from("partner_relationships")
        .select("id")
        .or(`owner_user_id.eq.${targetProfile.user_id},supporter_user_id.eq.${targetProfile.user_id}`)
        .eq("status", "active")
        .maybeSingle()

      if (targetActiveErr) {
        return { ok: false, error: "Database error checking target user relationship status." }
      }

      if (targetActive) {
        return {
          ok: false,
          error: "This user already has an active partner connection. 1:1 model allows only one active connection.",
        }
      }

      // Check if target already has a pending outgoing or incoming invitation
      const { data: targetPending, error: targetPendingErr } = await supabase
        .from("partner_invitations")
        .select("id, status, expires_at")
        .or(`inviter_user_id.eq.${targetProfile.user_id},invitee_user_id.eq.${targetProfile.user_id}`)
        .eq("status", "pending")
        .maybeSingle()

      if (targetPendingErr) {
        return { ok: false, error: "Database error checking target user pending status." }
      }

      if (targetPending) {
        if (!isInvitationExpired(targetPending.expires_at)) {
          return {
            ok: false,
            error: "This user already has a pending partner invitation.",
          }
        }
      }

      targetUserId = targetProfile.user_id
      targetInfo = {
        username: targetProfile.username || normalizedTarget,
        displayName: targetProfile.display_name || targetProfile.username || normalizedTarget,
      }
    }

    // 4. Create relationship record in 'pending' state
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

    // 5. Generate cryptographically secure token & hash
    const rawToken = generateInvitationToken()
    const tokenHash = hashInvitationToken(rawToken)
    const expiresAt = calculateInvitationExpiry().toISOString()

    // 6. Insert invitation record with token_hash (NEVER rawToken) and bound recipient
    const { data: invitation, error: invError } = await supabase
      .from("partner_invitations")
      .insert({
        relationship_id: relationship.id,
        inviter_user_id: inviterUserId,
        invitee_user_id: targetUserId,
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

    // 7. Dispatch in-app and web push notification to invitee if target user is bound
    if (targetUserId) {
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("user_id", inviterUserId)
        .maybeSingle()

      const inviterUsername = inviterProfile?.username || "partner"
      const inviterDisplayName = inviterProfile?.display_name || inviterUsername

      try {
        await sendPartnerInvitationNotification({
          supabase,
          inviteeUserId: targetUserId,
          inviterUserId,
          inviterUsername,
          inviterDisplayName,
          invitationId: invitation.id,
        })
      } catch (notifErr) {
        console.error("[createPartnerInvitation] Notification delivery background error:", notifErr)
      }
    }

    return {
      ok: true,
      data: {
        rawToken,
        invitation: invitation as PartnerInvitation,
        relationship: relationship as PartnerRelationship,
        invitee: targetInfo,
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
  rawToken: string,
  currentUserId?: string
): Promise<VerifyInvitationResult> {
  try {
    if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length === 0) {
      return { valid: false, error: "No invitation token provided." }
    }

    const tokenHash = hashInvitationToken(rawToken.trim())

    const { data: invitation, error: invError } = await supabase
      .from("partner_invitations")
      .select("id, relationship_id, inviter_user_id, invitee_user_id, expires_at, status, created_at")
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

    // Retrieve inviter display name and username for safe preview (never expose email or private data)
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", invitation.inviter_user_id)
      .maybeSingle()

    // Retrieve invitee username if bound
    let inviteeUsername: string | null = null
    if (invitation.invitee_user_id) {
      const { data: inviteeProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", invitation.invitee_user_id)
        .maybeSingle()
      inviteeUsername = inviteeProfile?.username || null
    }

    const isCurrentUserInviter = currentUserId ? invitation.inviter_user_id === currentUserId : false
    const isTargetRecipient =
      currentUserId && invitation.invitee_user_id
        ? invitation.invitee_user_id === currentUserId
        : true

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
        displayName: inviterProfile?.display_name || "Seijun User",
        username: inviterProfile?.username || null,
      },
      invitee: {
        username: inviteeUsername,
      },
      isCurrentUserInviter,
      isTargetRecipient,
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
 * 4. Recipient binding: If bound to specific recipient, only they can accept.
 * 5. 1:1 rule: Accepter cannot already have an active relationship.
 * 6. Atomic state transition to active and single-use invalidation.
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

    // 1. Try atomic PostgreSQL RPC if available
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("accept_partner_invitation", {
        p_token_hash: tokenHash,
        p_accepting_user_id: acceptingUserId,
      })

      if (!rpcError && rpcData && typeof rpcData === "object") {
        const result = rpcData as { ok?: boolean; error?: string; relationship_id?: string }
        if (result.ok && result.relationship_id) {
          return { ok: true, data: { relationshipId: result.relationship_id } }
        }
        if (result.error) {
          return { ok: false, error: result.error }
        }
      }
    } catch {
      // Fall through to service-level execution if RPC function is not installed in current environment
    }

    // 2. Service-level atomic validation fallback
    const { data: invitation, error: invError } = await supabase
      .from("partner_invitations")
      .select("id, relationship_id, inviter_user_id, invitee_user_id, expires_at, status")
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

    // Recipient binding check: cannot accept someone else's invitation
    if (invitation.invitee_user_id && invitation.invitee_user_id !== acceptingUserId) {
      return { ok: false, error: "This invitation was sent to a different account." }
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

/**
 * Service: Retrieves complete partner connection state for UI rendering.
 * Handled states:
 * - none: No active relationship, no pending invitation.
 * - outgoing_pending: Current user created an invitation waiting for partner acceptance.
 * - incoming_pending: Another user sent an invitation to current user.
 * - active: Connected 1:1 partner relationship.
 */
export async function getPartnerConnectionState(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PartnerActionResult<PartnerConnectionState>> {
  try {
    if (!userId) {
      return { ok: false, error: "Authentication required to retrieve partner connection state." }
    }

    // 1. Check for active relationship
    const { data: activeRel, error: activeErr } = await supabase
      .from("partner_relationships")
      .select("id, status, owner_user_id, supporter_user_id, created_at, accepted_at")
      .or(`owner_user_id.eq.${userId},supporter_user_id.eq.${userId}`)
      .eq("status", "active")
      .maybeSingle()

    if (activeErr) {
      return { ok: false, error: "Error checking active relationship." }
    }

    if (activeRel) {
      const isOwner = activeRel.owner_user_id === userId
      const partnerUserId = isOwner ? activeRel.supporter_user_id : activeRel.owner_user_id

      let partnerInfo = { username: "partner", displayName: "Partner" }
      if (partnerUserId) {
        const { data: pProfile } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("user_id", partnerUserId)
          .maybeSingle()

        if (pProfile) {
          partnerInfo = {
            username: pProfile.username || "partner",
            displayName: pProfile.display_name || pProfile.username || "Partner",
          }
        }
      }

      return {
        ok: true,
        data: {
          status: "active",
          partner: partnerInfo,
          relationship: {
            id: activeRel.id,
            status: activeRel.status as PartnerRelationshipStatus,
            role: isOwner ? "owner" : "supporter",
            createdAt: activeRel.created_at,
            acceptedAt: activeRel.accepted_at,
          },
        },
      }
    }

    // 2. Check for outgoing pending invitation
    const { data: outgoing, error: outErr } = await supabase
      .from("partner_invitations")
      .select("id, relationship_id, invitee_user_id, expires_at, status, created_at")
      .eq("inviter_user_id", userId)
      .eq("status", "pending")
      .maybeSingle()

    if (!outErr && outgoing) {
      if (isInvitationExpired(outgoing.expires_at)) {
        await supabase.from("partner_invitations").update({ status: "expired" }).eq("id", outgoing.id)
        await supabase.from("partner_relationships").update({ status: "expired" }).eq("id", outgoing.relationship_id)
      } else {
        let inviteeUsername = ""
        let inviteeDisplayName = ""
        if (outgoing.invitee_user_id) {
          const { data: targetProfile } = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("user_id", outgoing.invitee_user_id)
            .maybeSingle()
          if (targetProfile) {
            inviteeUsername = targetProfile.username || ""
            inviteeDisplayName = targetProfile.display_name || targetProfile.username || ""
          }
        }

        return {
          ok: true,
          data: {
            status: "outgoing_pending",
            outgoingInvitation: {
              id: outgoing.id,
              expiresAt: outgoing.expires_at,
              createdAt: outgoing.created_at,
              inviteeUsername,
              inviteeDisplayName,
            },
          },
        }
      }
    }

    // 3. Check for incoming pending invitation
    const { data: incoming, error: inErr } = await supabase
      .from("partner_invitations")
      .select("id, relationship_id, inviter_user_id, expires_at, token_hash, status, created_at")
      .eq("invitee_user_id", userId)
      .eq("status", "pending")
      .maybeSingle()

    if (!inErr && incoming) {
      if (isInvitationExpired(incoming.expires_at)) {
        await supabase.from("partner_invitations").update({ status: "expired" }).eq("id", incoming.id)
        await supabase.from("partner_relationships").update({ status: "expired" }).eq("id", incoming.relationship_id)
      } else {
        let inviterUsername = ""
        let inviterDisplayName = ""
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("user_id", incoming.inviter_user_id)
          .maybeSingle()

        if (senderProfile) {
          inviterUsername = senderProfile.username || ""
          inviterDisplayName = senderProfile.display_name || senderProfile.username || ""
        }

        return {
          ok: true,
          data: {
            status: "incoming_pending",
            incomingInvitation: {
              id: incoming.id,
              expiresAt: incoming.expires_at,
              createdAt: incoming.created_at,
              inviterUsername,
              inviterDisplayName,
              tokenHash: incoming.token_hash,
            },
          },
        }
      }
    }

    return {
      ok: true,
      data: {
        status: "none",
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error retrieving partner connection state."
    return { ok: false, error: message }
  }
}

/**
 * Service: Accepts an invitation directly by ID (for authenticated recipient in in-app UI).
 */
export async function acceptInvitationById(
  supabase: SupabaseClient<Database>,
  invitationId: string,
  acceptingUserId: string
): Promise<PartnerActionResult<{ relationshipId: string }>> {
  try {
    if (!invitationId || !acceptingUserId) {
      return { ok: false, error: "Invalid invitation parameters." }
    }

    const { data: invitation, error: invError } = await supabase
      .from("partner_invitations")
      .select("id, relationship_id, inviter_user_id, invitee_user_id, expires_at, status")
      .eq("id", invitationId)
      .maybeSingle()

    if (invError || !invitation) {
      return { ok: false, error: "Invitation not found." }
    }

    if (invitation.status !== "pending") {
      return { ok: false, error: `Invitation is ${invitation.status} and cannot be accepted.` }
    }

    if (isInvitationExpired(invitation.expires_at)) {
      await supabase.from("partner_invitations").update({ status: "expired" }).eq("id", invitation.id)
      await supabase.from("partner_relationships").update({ status: "expired" }).eq("id", invitation.relationship_id)
      return { ok: false, error: "This invitation has expired." }
    }

    if (invitation.inviter_user_id === acceptingUserId) {
      return { ok: false, error: "You cannot accept your own invitation." }
    }

    if (invitation.invitee_user_id && invitation.invitee_user_id !== acceptingUserId) {
      return { ok: false, error: "This invitation was sent to a different account." }
    }

    // 1:1 check for accepter
    const { data: accepterActive } = await supabase
      .from("partner_relationships")
      .select("id")
      .or(`owner_user_id.eq.${acceptingUserId},supporter_user_id.eq.${acceptingUserId}`)
      .eq("status", "active")
      .maybeSingle()

    if (accepterActive) {
      return { ok: false, error: "You already have an active partner connection. 1:1 model allows only one active connection." }
    }

    // 1:1 check for inviter
    const { data: inviterActive } = await supabase
      .from("partner_relationships")
      .select("id")
      .or(`owner_user_id.eq.${invitation.inviter_user_id},supporter_user_id.eq.${invitation.inviter_user_id}`)
      .eq("status", "active")
      .maybeSingle()

    if (inviterActive) {
      return { ok: false, error: "The invitation sender already has an active partner connection." }
    }

    const now = new Date().toISOString()

    const { error: relError } = await supabase
      .from("partner_relationships")
      .update({
        supporter_user_id: acceptingUserId,
        status: "active",
        accepted_at: now,
      })
      .eq("id", invitation.relationship_id)
      .eq("status", "pending")

    if (relError) {
      return { ok: false, error: "Failed to activate partner relationship." }
    }

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
    const message = err instanceof Error ? err.message : "Error accepting invitation."
    return { ok: false, error: message }
  }
}

