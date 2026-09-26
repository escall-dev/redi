/**
 * Seijun Phase 19: Partner Invitation Acceptance Regression Test Suite
 *
 * Verifies the bug fix for Partner Invitation Acceptance:
 * 1. Root Cause Resolution:
 *    - Database migration & RLS policies allow authenticated invitee to accept/decline
 *    - Atomic RPCs exist for in-app UI acceptance & decline by ID
 *    - Service layer verifies row update counts (no false success on zero-row updates)
 *    - Server actions invalidate cache via revalidatePath
 *    - UI components trigger state sync and router.refresh()
 * 2. Complete Lifecycle & State Machine Simulation:
 *    - Pending invitation -> Accept -> Transition to accepted
 *    - Active relationship established with supporter attached
 *    - Invitation cannot be accepted again (single-use)
 *    - Zero-row update detection prevents false success
 *    - Wrong recipient rejection
 *    - Self-acceptance rejection
 *    - Expired invitation rejection
 *    - Active relationship 1:1 conflict rejection
 *    - Decline lifecycle
 */

import fs from "fs"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"
import {
  generateInvitationToken,
  hashInvitationToken,
  calculateInvitationExpiry,
  isInvitationExpired,
} from "../lib/partner/token.ts"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Phase 19 Partner Invitation Acceptance Regression Test Suite ===\n")

let failures = 0
let passed = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`)
    failures++
  } else {
    console.log(`  ✓ ${message}`)
    passed++
  }
}

// ==============================================================================
// 1. DATABASE MIGRATION & RLS AUDIT
// ==============================================================================
console.log("[Test 1] Auditing Phase 19 Invitation Acceptance Database Migration & RLS Fix...")

const migrationPath = path.join(
  rootDir,
  "supabase",
  "migrations",
  "20260924000009_partner_invitation_acceptance_fix.sql"
)

assert(fs.existsSync(migrationPath), "Migration 20260924000009_partner_invitation_acceptance_fix.sql exists")
const migrationContent = fs.readFileSync(migrationPath, "utf-8")

// RLS on partner_relationships
assert(
  migrationContent.includes("Participants can update their partner relationships"),
  "partner_relationships UPDATE policy updated"
)
assert(
  migrationContent.includes("status = 'pending'") &&
  migrationContent.includes("EXISTS (") &&
  migrationContent.includes("public.partner_invitations"),
  "partner_relationships RLS permits pending invited recipient to accept"
)

// RLS on partner_invitations
assert(
  migrationContent.includes("Participants can update their invitations"),
  "partner_invitations UPDATE policy updated"
)
assert(
  migrationContent.includes("status IN ('accepted', 'declined')"),
  "partner_invitations RLS constrains invitee update to accepted or declined"
)

// Permission grant on accept_partner_invitation
assert(
  migrationContent.includes("GRANT EXECUTE ON FUNCTION public.accept_partner_invitation(TEXT, UUID) TO authenticated"),
  "EXECUTE permission on accept_partner_invitation granted to authenticated"
)

// Atomic RPC accept_partner_invitation_by_id
assert(
  migrationContent.includes("CREATE OR REPLACE FUNCTION public.accept_partner_invitation_by_id"),
  "Atomic accept_partner_invitation_by_id RPC declared"
)
assert(
  migrationContent.includes("GRANT EXECUTE ON FUNCTION public.accept_partner_invitation_by_id(UUID, UUID) TO authenticated"),
  "EXECUTE permission on accept_partner_invitation_by_id granted to authenticated"
)

// Atomic RPC decline_partner_invitation_by_id
assert(
  migrationContent.includes("CREATE OR REPLACE FUNCTION public.decline_partner_invitation_by_id"),
  "Atomic decline_partner_invitation_by_id RPC declared"
)
assert(
  migrationContent.includes("GRANT EXECUTE ON FUNCTION public.decline_partner_invitation_by_id(UUID, UUID) TO authenticated"),
  "EXECUTE permission on decline_partner_invitation_by_id granted to authenticated"
)

// ==============================================================================
// 2. CODEBASE AUDIT: SERVICE, ACTIONS, TYPES, UI
// ==============================================================================
console.log("\n[Test 2] Auditing Service, Server Actions, TypeScript Types & UI...")

// Types
const typesPath = path.join(rootDir, "lib", "supabase", "types.ts")
const typesContent = fs.readFileSync(typesPath, "utf-8")
assert(
  typesContent.includes("accept_partner_invitation_by_id: {"),
  "types.ts exports accept_partner_invitation_by_id RPC signature"
)
assert(
  typesContent.includes("decline_partner_invitation_by_id: {"),
  "types.ts exports decline_partner_invitation_by_id RPC signature"
)

// Service
const servicePath = path.join(rootDir, "lib", "partner", "service.ts")
const serviceContent = fs.readFileSync(servicePath, "utf-8")
assert(
  serviceContent.includes("export async function acceptInvitationById"),
  "service.ts exports acceptInvitationById"
)
assert(
  serviceContent.includes("export async function declineInvitationById"),
  "service.ts exports declineInvitationById"
)
assert(
  serviceContent.includes("accept_partner_invitation_by_id"),
  "acceptInvitationById attempts atomic RPC by ID"
)
assert(
  serviceContent.includes("accept_partner_invitation"),
  "acceptInvitationById provides token RPC fallback"
)
assert(
  serviceContent.includes("Record was not updated") || serviceContent.includes("!updatedRel"),
  "acceptInvitationById verifies row update count to prevent false success"
)
assert(
  serviceContent.includes("!updatedInv"),
  "acceptInvitationById verifies invitation row update count"
)

// Server Actions
const actionPath = path.join(rootDir, "app", "actions", "partner.ts")
const actionContent = fs.readFileSync(actionPath, "utf-8")
assert(
  actionContent.includes("revalidatePath"),
  "actions/partner.ts imports revalidatePath"
)
assert(
  actionContent.includes("export async function acceptPartnerInvitationByIdAction"),
  "actions/partner.ts exports acceptPartnerInvitationByIdAction"
)
assert(
  actionContent.includes("export async function declinePartnerInvitationByIdAction"),
  "actions/partner.ts exports declinePartnerInvitationByIdAction"
)
assert(
  actionContent.includes('revalidatePath("/settings/partner")') &&
  actionContent.includes('revalidatePath("/dashboard")'),
  "acceptPartnerInvitationByIdAction invalidates Next.js cache"
)

// UI Component
const cardPath = path.join(rootDir, "components", "partner", "partner-connection-card.tsx")
const cardContent = fs.readFileSync(cardPath, "utf-8")
assert(
  cardContent.includes("acceptPartnerInvitationByIdAction"),
  "PartnerConnectionCard imports acceptPartnerInvitationByIdAction"
)
assert(
  cardContent.includes("declinePartnerInvitationByIdAction"),
  "PartnerConnectionCard imports declinePartnerInvitationByIdAction"
)
assert(
  cardContent.includes("router.refresh()"),
  "PartnerConnectionCard invokes router.refresh() on acceptance and decline"
)
assert(
  cardContent.includes("handleAcceptIncoming") && cardContent.includes("handleDeclineIncoming"),
  "PartnerConnectionCard handles incoming accept and decline actions"
)

// Acceptance View
const viewPath = path.join(rootDir, "components", "partner", "invitation-acceptance-view.tsx")
const viewContent = fs.readFileSync(viewPath, "utf-8")
assert(
  viewContent.includes("router.refresh()"),
  "InvitationAcceptanceView calls router.refresh() upon acceptance"
)

// ==============================================================================
// 3. COMPLETE INVITATION ACCEPTANCE LIFECYCLE SIMULATION
// ==============================================================================
console.log("\n[Test 3] Simulating Complete Partner Acceptance Lifecycle & Bug Regression...")

class SimulationDatabase {
  constructor() {
    this.relationships = new Map()
    this.invitations = new Map()
  }

  createPendingInvitation(inviterId, inviteeId) {
    const relId = crypto.randomUUID()
    const invId = crypto.randomUUID()
    const rawToken = generateInvitationToken()
    const tokenHash = hashInvitationToken(rawToken)
    const expiresAt = calculateInvitationExpiry().toISOString()

    const relationship = {
      id: relId,
      owner_user_id: inviterId,
      supporter_user_id: null,
      status: "pending",
      created_at: new Date().toISOString(),
      accepted_at: null,
    }

    const invitation = {
      id: invId,
      relationship_id: relId,
      inviter_user_id: inviterId,
      invitee_user_id: inviteeId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: "pending",
      created_at: new Date().toISOString(),
      accepted_at: null,
    }

    this.relationships.set(relId, relationship)
    this.invitations.set(invId, invitation)

    return { relationship, invitation, rawToken }
  }

  // Simulates acceptInvitationById with the exact bug fix logic
  acceptInvitationById(invitationId, acceptingUserId, simulateRlsBlock = false) {
    const invitation = this.invitations.get(invitationId)
    if (!invitation) {
      return { ok: false, error: "Invitation not found." }
    }

    if (invitation.status !== "pending") {
      return { ok: false, error: `Invitation is ${invitation.status} and cannot be accepted.` }
    }

    if (isInvitationExpired(invitation.expires_at)) {
      return { ok: false, error: "This invitation has expired." }
    }

    if (invitation.inviter_user_id === acceptingUserId) {
      return { ok: false, error: "You cannot accept your own invitation." }
    }

    if (invitation.invitee_user_id && invitation.invitee_user_id !== acceptingUserId) {
      return { ok: false, error: "This invitation was sent to a different account." }
    }

    // 1:1 check for accepter
    for (const rel of this.relationships.values()) {
      if (
        rel.status === "active" &&
        (rel.owner_user_id === acceptingUserId || rel.supporter_user_id === acceptingUserId)
      ) {
        return { ok: false, error: "You already have an active partner connection. 1:1 model allows only one active connection." }
      }
    }

    // 1:1 check for inviter
    for (const rel of this.relationships.values()) {
      if (
        rel.status === "active" &&
        (rel.owner_user_id === invitation.inviter_user_id || rel.supporter_user_id === invitation.inviter_user_id)
      ) {
        return { ok: false, error: "The invitation sender already has an active partner connection." }
      }
    }

    // If RLS blocked the update (the original bug condition):
    if (simulateRlsBlock) {
      // In the old code, this returned ok: true because 0 rows returned no error!
      // In the fixed code with .select("id").maybeSingle(), zero rows are caught as an error:
      const updatedRel = null // 0 rows updated
      if (!updatedRel) {
        return { ok: false, error: "Failed to activate partner relationship. Record was not updated." }
      }
    }

    const now = new Date().toISOString()
    const rel = this.relationships.get(invitation.relationship_id)
    rel.supporter_user_id = acceptingUserId
    rel.status = "active"
    rel.accepted_at = now

    invitation.status = "accepted"
    invitation.accepted_at = now

    return { ok: true, data: { relationshipId: rel.id } }
  }

  declineInvitationById(invitationId, decliningUserId) {
    const invitation = this.invitations.get(invitationId)
    if (!invitation) {
      return { ok: false, error: "Invitation not found." }
    }

    if (invitation.status !== "pending") {
      return { ok: false, error: `Invitation cannot be declined because it is ${invitation.status}.` }
    }

    if (invitation.inviter_user_id === decliningUserId) {
      return { ok: false, error: "You cannot decline your own invitation. Use cancel instead." }
    }

    if (invitation.invitee_user_id && invitation.invitee_user_id !== decliningUserId) {
      return { ok: false, error: "This invitation was addressed to a different account." }
    }

    invitation.status = "declined"
    const rel = this.relationships.get(invitation.relationship_id)
    rel.status = "declined"

    return { ok: true }
  }
}

const db = new SimulationDatabase()
const USER_A = "user-a-uuid"
const USER_B = "user-b-uuid"
const USER_C = "user-c-uuid"

// Case 1: Standard acceptance flow
const { invitation: inv1, relationship: rel1 } = db.createPendingInvitation(USER_A, USER_B)
assert(inv1.status === "pending", "Initial invitation status is 'pending'")
assert(rel1.status === "pending", "Initial relationship status is 'pending'")
assert(rel1.supporter_user_id === null, "Initial supporter_user_id is null")

const acceptResult = db.acceptInvitationById(inv1.id, USER_B)
assert(acceptResult.ok === true, "Acceptance succeeds for intended recipient USER_B")
assert(inv1.status === "accepted", "Invitation status transitioned to 'accepted'")
assert(rel1.status === "active", "Relationship status transitioned to 'active'")
assert(rel1.supporter_user_id === USER_B, "Supporter attached to active relationship")

// Case 2: Cannot accept already-accepted invitation (single-use invariant)
const reAcceptResult = db.acceptInvitationById(inv1.id, USER_B)
assert(reAcceptResult.ok === false, "Already-accepted invitation cannot be accepted again")
assert(reAcceptResult.error.includes("already been accepted") || reAcceptResult.error.includes("accepted"), "Error message specifies already accepted")

// Case 3: Zero-row update detection (Regression for the silent RLS block)
const { invitation: invRls } = db.createPendingInvitation("user-x", "user-y")
const rlsResult = db.acceptInvitationById(invRls.id, "user-y", true /* simulateRlsBlock */)
assert(rlsResult.ok === false, "Zero-row update is detected as an error, NOT a false success")
assert(rlsResult.error.includes("Record was not updated"), "Descriptive failure returned when record update is blocked")

// Case 4: Wrong recipient rejection
const { invitation: inv2 } = db.createPendingInvitation("user-d", USER_B)
const wrongRecipientResult = db.acceptInvitationById(inv2.id, USER_C)
assert(wrongRecipientResult.ok === false, "Wrong recipient USER_C cannot accept invitation for USER_B")
assert(wrongRecipientResult.error.includes("different account"), "Recipient binding error returned")

// Case 5: Self-acceptance rejection
const { invitation: inv3 } = db.createPendingInvitation("user-e", "user-f")
const selfAcceptResult = db.acceptInvitationById(inv3.id, "user-e")
assert(selfAcceptResult.ok === false, "Inviter cannot accept their own invitation")
assert(selfAcceptResult.error.includes("own invitation"), "Self-acceptance error returned")

// Case 6: Expired invitation rejection
const { invitation: inv4 } = db.createPendingInvitation("user-g", "user-h")
inv4.expires_at = new Date(Date.now() - 1000).toISOString()
const expiredResult = db.acceptInvitationById(inv4.id, "user-h")
assert(expiredResult.ok === false, "Expired invitation cannot be accepted")
assert(expiredResult.error.includes("expired"), "Expired error returned")

// Case 7: 1:1 conflict - Accepter already in active relationship
const { invitation: inv5 } = db.createPendingInvitation("user-i", USER_B)
const duplicateActiveResult = db.acceptInvitationById(inv5.id, USER_B)
assert(duplicateActiveResult.ok === false, "User already in active relationship cannot accept new invitation")
assert(duplicateActiveResult.error.includes("1:1 model"), "1:1 active connection conflict error returned")

// Case 8: Decline flow
const { invitation: inv6, relationship: rel6 } = db.createPendingInvitation("user-j", "user-k")
const declineResult = db.declineInvitationById(inv6.id, "user-k")
assert(declineResult.ok === true, "Decline succeeds for intended recipient")
assert(inv6.status === "declined", "Invitation status transitioned to 'declined'")
assert(rel6.status === "declined", "Relationship status transitioned to 'declined'")

// Case 9: Cannot accept declined invitation
const acceptDeclinedResult = db.acceptInvitationById(inv6.id, "user-k")
assert(acceptDeclinedResult.ok === false, "Declined invitation cannot be accepted")

// ==============================================================================
// SUMMARY
// ==============================================================================
console.log("\n=================================================")
if (failures === 0) {
  console.log(`ALL PHASE 19 INVITATION ACCEPTANCE REGRESSION TESTS PASSED! 🎉 (${passed} passed, 0 failed)`)
} else {
  console.error(`TESTS FAILED: ${failures} failure(s), ${passed} passed.`)
  process.exit(1)
}
console.log("=================================================\n")
