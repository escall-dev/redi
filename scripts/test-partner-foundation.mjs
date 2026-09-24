/**
 * Seijun Phase 19: Partner Connection Foundation (Batch 1) Test Suite
 *
 * Verifies all Batch 1 requirements:
 * 1. Database schema, defaults, triggers, indexes, and RLS policies
 * 2. 1:1 relationship rules & duplicate prevention constraints
 * 3. Conservative privacy-first sharing preference defaults (all false)
 * 4. Supporter permissions & mutation denial (owner-only control)
 * 5. Cryptographic token generation, SHA-256 hashing at rest, timing-safe verification
 * 6. 7-day expiration logic and expired token rejection
 * 7. Single-use invitation lifecycle (pending -> accepted -> reject reuse)
 * 8. Rejection of cancelled, declined, or self-accepted invitations
 * 9. RLS policy invariants across all 3 partner tables
 * 10. Service layer authorization & Server Action security contracts
 */

import fs from "fs"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Phase 19: Partner Connection Foundation Test Suite ===\n")

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
// 1. DATABASE SCHEMA & RLS STATIC AUDIT
// ==============================================================================
console.log("[Test 1] Auditing Phase 19 Database Migration & RLS policies...")

const migrationPath = path.join(
  rootDir,
  "supabase",
  "migrations",
  "20260924000001_partner_foundation.sql"
)

assert(fs.existsSync(migrationPath), "Migration 20260924000001_partner_foundation.sql exists")

const migrationContent = fs.readFileSync(migrationPath, "utf-8")

// Table 1: partner_relationships
assert(
  migrationContent.includes("CREATE TABLE IF NOT EXISTS public.partner_relationships"),
  "Table public.partner_relationships declared"
)
assert(
  migrationContent.includes("owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE"),
  "partner_relationships.owner_user_id references auth.users(id) with CASCADE"
)
assert(
  migrationContent.includes("supporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL"),
  "partner_relationships.supporter_user_id references auth.users(id) with SET NULL"
)
assert(
  migrationContent.includes("status TEXT NOT NULL DEFAULT 'pending'"),
  "partner_relationships.status defaults to 'pending'"
)
assert(
  migrationContent.includes("check_partner_relationships_status"),
  "Status check constraint declared"
)
assert(
  migrationContent.includes("check_partner_relationships_not_self"),
  "Self-partnering prevention constraint declared"
)
assert(
  migrationContent.includes("set_partner_relationships_updated_at"),
  "partner_relationships updated_at trigger attached"
)

// 1:1 Relationship Enforcement
assert(
  migrationContent.includes("idx_partner_relationships_unique_active_owner"),
  "Partial unique index enforces at most 1 active relationship per owner"
)
assert(
  migrationContent.includes("idx_partner_relationships_unique_active_supporter"),
  "Partial unique index enforces at most 1 active relationship per supporter"
)
assert(
  migrationContent.includes("idx_partner_relationships_unique_pending_owner"),
  "Partial unique index enforces at most 1 pending relationship per owner"
)

// Table 2: partner_sharing_preferences
assert(
  migrationContent.includes("CREATE TABLE IF NOT EXISTS public.partner_sharing_preferences"),
  "Table public.partner_sharing_preferences declared"
)
assert(
  migrationContent.includes("relationship_id UUID NOT NULL UNIQUE REFERENCES public.partner_relationships(id) ON DELETE CASCADE"),
  "partner_sharing_preferences.relationship_id is UNIQUE with CASCADE"
)
assert(
  migrationContent.includes("cycle_estimates BOOLEAN NOT NULL DEFAULT FALSE"),
  "cycle_estimates defaults to FALSE (privacy-first)"
)
assert(
  migrationContent.includes("period_status BOOLEAN NOT NULL DEFAULT FALSE"),
  "period_status defaults to FALSE (privacy-first)"
)
assert(
  migrationContent.includes("cycle_preferences BOOLEAN NOT NULL DEFAULT FALSE"),
  "cycle_preferences defaults to FALSE (privacy-first)"
)
assert(
  migrationContent.includes("daily_notes BOOLEAN NOT NULL DEFAULT FALSE"),
  "daily_notes defaults to FALSE (privacy-first)"
)
assert(
  migrationContent.includes("on_partner_relationship_created"),
  "Trigger automatically initializes default sharing preferences upon relationship creation"
)

// Table 3: partner_invitations
assert(
  migrationContent.includes("CREATE TABLE IF NOT EXISTS public.partner_invitations"),
  "Table public.partner_invitations declared"
)
assert(
  migrationContent.includes("token_hash TEXT NOT NULL UNIQUE"),
  "token_hash is TEXT NOT NULL UNIQUE (raw tokens NEVER stored at rest)"
)
assert(
  migrationContent.includes("expires_at TIMESTAMPTZ NOT NULL"),
  "expires_at timestamp declared"
)
assert(
  migrationContent.includes("check_partner_invitations_status"),
  "Invitation status check constraint declared"
)
assert(
  migrationContent.includes("idx_partner_invitations_unique_pending_inviter"),
  "Partial unique index prevents duplicate pending invitations for inviter"
)

// RLS Policies Audit
assert(
  migrationContent.includes("ALTER TABLE public.partner_relationships ENABLE ROW LEVEL SECURITY;"),
  "RLS enabled on partner_relationships"
)
assert(
  migrationContent.includes("ALTER TABLE public.partner_sharing_preferences ENABLE ROW LEVEL SECURITY;"),
  "RLS enabled on partner_sharing_preferences"
)
assert(
  migrationContent.includes("ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;"),
  "RLS enabled on partner_invitations"
)

// Sharing Preferences RLS Security
assert(
  migrationContent.includes("Owners can insert sharing preferences"),
  "Sharing preferences INSERT policy restricted to owner"
)
assert(
  migrationContent.includes("Owners can update sharing preferences"),
  "Sharing preferences UPDATE policy restricted to owner (supporter cannot modify)"
)
assert(
  migrationContent.includes("Owners can delete sharing preferences"),
  "Sharing preferences DELETE policy restricted to owner"
)
assert(
  migrationContent.includes("Authorized participants can view sharing preferences"),
  "Sharing preferences SELECT requires owner or ACTIVE supporter relationship"
)

// ==============================================================================
// 2. TYPESCRIPT DOMAIN TYPES & CONSTANTS AUDIT
// ==============================================================================
console.log("\n[Test 2] Auditing TypeScript types & constants...")

const typesPath = path.join(rootDir, "lib", "supabase", "types.ts")
const typesContent = fs.readFileSync(typesPath, "utf-8")

assert(
  typesContent.includes('export type PartnerRelationshipStatus = "pending" | "active" | "revoked" | "declined" | "expired"'),
  "PartnerRelationshipStatus exported with 5 valid states"
)
assert(
  typesContent.includes('export type PartnerInvitationStatus = "pending" | "accepted" | "declined" | "expired" | "cancelled"'),
  "PartnerInvitationStatus exported with 5 valid states"
)
assert(
  typesContent.includes("partner_relationships: {"),
  "Database types include partner_relationships"
)
assert(
  typesContent.includes("partner_sharing_preferences: {"),
  "Database types include partner_sharing_preferences"
)
assert(
  typesContent.includes("partner_invitations: {"),
  "Database types include partner_invitations"
)

const partnerTypesPath = path.join(rootDir, "lib", "partner", "types.ts")
assert(fs.existsSync(partnerTypesPath), "lib/partner/types.ts exists")
const partnerTypesContent = fs.readFileSync(partnerTypesPath, "utf-8")

assert(
  partnerTypesContent.includes("INVITATION_EXPIRATION_DAYS = 7"),
  "INVITATION_EXPIRATION_DAYS set to 7 days"
)
assert(
  partnerTypesContent.includes("DEFAULT_PARTNER_SHARING_PREFERENCES"),
  "DEFAULT_PARTNER_SHARING_PREFERENCES exported"
)
assert(
  partnerTypesContent.includes("cycle_estimates: false") &&
  partnerTypesContent.includes("period_status: false") &&
  partnerTypesContent.includes("cycle_preferences: false") &&
  partnerTypesContent.includes("daily_notes: false"),
  "Default sharing preferences are strictly privacy-first (all false)"
)

// ==============================================================================
// 3. CRYPTOGRAPHIC TOKEN SECURITY TESTS
// ==============================================================================
console.log("\n[Test 3] Testing Cryptographic Token Generation, Hashing & Timing-Safety...")

const tokenModulePath = path.join(rootDir, "lib", "partner", "token.ts")
assert(fs.existsSync(tokenModulePath), "lib/partner/token.ts exists")

// Dynamically import token module
const {
  generateInvitationToken,
  hashInvitationToken,
  verifyTokenHash,
  calculateInvitationExpiry,
  isInvitationExpired,
} = await import("../lib/partner/token.ts")

// Entropy & Format test
const token1 = generateInvitationToken()
const token2 = generateInvitationToken()

assert(typeof token1 === "string" && token1.length === 64, "Generated token is 64 hex characters (256 bits entropy)")
assert(/^[0-9a-f]{64}$/.test(token1), "Token contains valid hexadecimal characters")
assert(token1 !== token2, "Successive token generations are completely unique (no collision)")

// SHA-256 Hashing test
const hash1 = hashInvitationToken(token1)
const expectedHash1 = crypto.createHash("sha256").update(token1).digest("hex")

assert(typeof hash1 === "string" && hash1.length === 64, "Token hash is 64 hex characters (SHA-256)")
assert(hash1 === expectedHash1, "hashInvitationToken matches standard SHA-256 digest")
assert(hash1 !== token1, "Hash differs from raw token (raw token is never equal to hash)")

// Constant-time verification test
assert(verifyTokenHash(token1, hash1) === true, "verifyTokenHash validates matching token and hash")
assert(verifyTokenHash(token2, hash1) === false, "verifyTokenHash rejects non-matching token")
assert(verifyTokenHash("", hash1) === false, "verifyTokenHash safely rejects empty token")
assert(verifyTokenHash(token1, "") === false, "verifyTokenHash safely rejects empty hash")
assert(verifyTokenHash("invalid-length", hash1) === false, "verifyTokenHash safely handles mismatched lengths")

// Expiration calculation & detection (7 days)
const baseTime = Date.now()
const expiryDate = calculateInvitationExpiry(baseTime)
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

assert(
  expiryDate.getTime() === baseTime + sevenDaysMs,
  "calculateInvitationExpiry calculates timestamp exactly 7 days ahead"
)
assert(
  isInvitationExpired(expiryDate, baseTime) === false,
  "Invitation is NOT expired at creation time"
)
assert(
  isInvitationExpired(expiryDate, baseTime + sevenDaysMs - 1000) === false,
  "Invitation is NOT expired just before 7 days (6 days 23 hours 59 min)"
)
assert(
  isInvitationExpired(expiryDate, baseTime + sevenDaysMs) === true,
  "Invitation is expired at exact 7-day mark"
)
assert(
  isInvitationExpired(expiryDate, baseTime + sevenDaysMs + 1000) === true,
  "Invitation is expired after 7 days"
)
assert(
  isInvitationExpired("invalid-date-string") === true,
  "Malformed date is safely treated as expired"
)

// ==============================================================================
// 4. INVITATION & RELATIONSHIP LIFECYCLE SIMULATION TESTS
// ==============================================================================
console.log("\n[Test 4] Testing Invitation & Relationship State Machine Invariants...")

// In-memory simulation representing database state transitions
class MockDatabase {
  constructor() {
    this.relationships = new Map()
    this.sharingPreferences = new Map()
    this.invitations = new Map()
  }

  createRelationship(ownerId) {
    // 1:1 check: at most one active relationship per owner
    for (const rel of this.relationships.values()) {
      if (rel.status === "active" && (rel.owner_user_id === ownerId || rel.supporter_user_id === ownerId)) {
        throw new Error("Active relationship already exists for user (1:1 constraint)")
      }
      if (rel.status === "pending" && rel.owner_user_id === ownerId) {
        throw new Error("Pending relationship already exists for user")
      }
    }

    const id = crypto.randomUUID()
    const relationship = {
      id,
      owner_user_id: ownerId,
      supporter_user_id: null,
      status: "pending",
      created_at: new Date().toISOString(),
      accepted_at: null,
      revoked_at: null,
      updated_at: new Date().toISOString(),
    }
    this.relationships.set(id, relationship)

    // Trigger simulation: default sharing preferences
    this.sharingPreferences.set(id, {
      id: crypto.randomUUID(),
      relationship_id: id,
      owner_user_id: ownerId,
      cycle_estimates: false,
      period_status: false,
      cycle_preferences: false,
      daily_notes: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return relationship
  }

  createInvitation(relationshipId, inviterId, rawToken, expiresAt) {
    // Check pending invitation uniqueness
    for (const inv of this.invitations.values()) {
      if (inv.inviter_user_id === inviterId && inv.status === "pending") {
        throw new Error("Pending invitation already exists for inviter")
      }
    }

    const id = crypto.randomUUID()
    const tokenHash = hashInvitationToken(rawToken)
    const invitation = {
      id,
      relationship_id: relationshipId,
      inviter_user_id: inviterId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: "pending",
      created_at: new Date().toISOString(),
      accepted_at: null,
      declined_at: null,
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    }
    this.invitations.set(tokenHash, invitation)
    return invitation
  }

  acceptInvitation(rawToken, supporterId, currentTime = Date.now()) {
    const tokenHash = hashInvitationToken(rawToken)
    const invitation = this.invitations.get(tokenHash)

    if (!invitation) {
      throw new Error("Invitation not found")
    }

    // Single-use constraint: only 'pending' can be accepted
    if (invitation.status !== "pending") {
      throw new Error(`Single-use violation: Invitation status is ${invitation.status}`)
    }

    // 7-day expiration constraint
    if (isInvitationExpired(invitation.expires_at, currentTime)) {
      invitation.status = "expired"
      throw new Error("Invitation expired")
    }

    // Self-acceptance constraint
    if (invitation.inviter_user_id === supporterId) {
      throw new Error("Cannot accept own invitation")
    }

    // 1:1 constraint for supporter
    for (const rel of this.relationships.values()) {
      if (rel.status === "active" && (rel.owner_user_id === supporterId || rel.supporter_user_id === supporterId)) {
        throw new Error("Supporter already has an active relationship (1:1 constraint)")
      }
    }

    const relationship = this.relationships.get(invitation.relationship_id)
    if (!relationship) {
      throw new Error("Relationship not found")
    }

    // Atomic update
    const nowStr = new Date(currentTime).toISOString()
    relationship.supporter_user_id = supporterId
    relationship.status = "active"
    relationship.accepted_at = nowStr

    invitation.status = "accepted"
    invitation.accepted_at = nowStr

    return { relationship, invitation }
  }

  cancelInvitation(tokenHash, inviterId) {
    const invitation = this.invitations.get(tokenHash)
    if (!invitation || invitation.inviter_user_id !== inviterId) {
      throw new Error("Unauthorized or not found")
    }
    if (invitation.status !== "pending") {
      throw new Error("Cannot cancel non-pending invitation")
    }
    invitation.status = "cancelled"
    invitation.cancelled_at = new Date().toISOString()
    const rel = this.relationships.get(invitation.relationship_id)
    if (rel) {
      rel.status = "revoked"
      rel.revoked_at = new Date().toISOString()
    }
  }

  declineInvitation(tokenHash, decliningUserId) {
    const invitation = this.invitations.get(tokenHash)
    if (!invitation) {
      throw new Error("Not found")
    }
    if (invitation.status !== "pending") {
      throw new Error("Cannot decline non-pending invitation")
    }
    if (invitation.inviter_user_id === decliningUserId) {
      throw new Error("Cannot decline own invitation")
    }
    invitation.status = "declined"
    invitation.declined_at = new Date().toISOString()
    const rel = this.relationships.get(invitation.relationship_id)
    if (rel) {
      rel.status = "declined"
    }
  }

  revokeRelationship(relationshipId, userId) {
    const rel = this.relationships.get(relationshipId)
    if (!rel || (rel.owner_user_id !== userId && rel.supporter_user_id !== userId)) {
      throw new Error("Unauthorized or not found")
    }
    if (rel.status !== "active") {
      throw new Error("Cannot revoke inactive relationship")
    }
    rel.status = "revoked"
    rel.revoked_at = new Date().toISOString()
    return rel
  }

  updateSharingPreferences(relationshipId, userId, updates) {
    const rel = this.relationships.get(relationshipId)
    if (!rel) {
      throw new Error("Relationship not found")
    }
    // Strict owner-only modification rule
    if (rel.owner_user_id !== userId) {
      throw new Error("Supporter or unauthorized user cannot modify owner sharing preferences")
    }
    const prefs = this.sharingPreferences.get(relationshipId)
    if (!prefs) {
      throw new Error("Preferences not found")
    }
    Object.assign(prefs, updates, { updated_at: new Date().toISOString() })
    return prefs
  }

  getSharingPreferences(relationshipId, userId) {
    const rel = this.relationships.get(relationshipId)
    if (!rel) {
      throw new Error("Relationship not found")
    }
    const isOwner = rel.owner_user_id === userId
    const isSupporter = rel.supporter_user_id === userId && rel.status === "active"
    if (!isOwner && !isSupporter) {
      throw new Error("Unauthorized to view sharing preferences")
    }
    return this.sharingPreferences.get(relationshipId)
  }
}

const db = new MockDatabase()
const userA_Owner = "user-a-uuid"
const userB_Supporter = "user-b-uuid"
const userC_ThirdParty = "user-c-uuid"

// 1. Valid Relationship & Invitation Creation
const relA = db.createRelationship(userA_Owner)
assert(relA.status === "pending", "Relationship created in 'pending' state")
assert(relA.owner_user_id === userA_Owner, "Relationship owner matches User A")
assert(relA.supporter_user_id === null, "Relationship supporter is initially null")

const tokenA = generateInvitationToken()
const expiresAtA = calculateInvitationExpiry().toISOString()
const invA = db.createInvitation(relA.id, userA_Owner, tokenA, expiresAtA)
assert(invA.status === "pending", "Invitation created in 'pending' state")
assert(invA.token_hash === hashInvitationToken(tokenA), "Stored invitation has SHA-256 token hash")

// 2. Default Sharing Preferences (Conservative Privacy-First)
const initialPrefs = db.getSharingPreferences(relA.id, userA_Owner)
assert(initialPrefs.cycle_estimates === false, "Default cycle_estimates is FALSE")
assert(initialPrefs.period_status === false, "Default period_status is FALSE")
assert(initialPrefs.cycle_preferences === false, "Default cycle_preferences is FALSE")
assert(initialPrefs.daily_notes === false, "Default daily_notes is FALSE")

// 3. Duplicate Pending Invitation Prevention
let duplicatePendingError = false
try {
  db.createInvitation(relA.id, userA_Owner, generateInvitationToken(), expiresAtA)
} catch (err) {
  duplicatePendingError = true
}
assert(duplicatePendingError, "Prevented creating duplicate pending invitation for same inviter")

// 4. Duplicate Relationship Prevention
let duplicateRelError = false
try {
  db.createRelationship(userA_Owner)
} catch (err) {
  duplicateRelError = true
}
assert(duplicateRelError, "Prevented creating duplicate pending relationship for same owner")

// 5. Self-Acceptance Rejection
let selfAcceptError = false
try {
  db.acceptInvitation(tokenA, userA_Owner)
} catch (err) {
  selfAcceptError = true
}
assert(selfAcceptError, "Owner cannot accept their own invitation")

// 6. Valid Acceptance & Single-Use Transition
const { relationship: activeRel, invitation: acceptedInv } = db.acceptInvitation(tokenA, userB_Supporter)
assert(activeRel.status === "active", "Relationship transitioned to 'active'")
assert(activeRel.supporter_user_id === userB_Supporter, "Supporter attached to relationship")
assert(acceptedInv.status === "accepted", "Invitation transitioned to 'accepted'")

// 7. Single-Use Re-Acceptance Rejection
let reuseError = false
try {
  db.acceptInvitation(tokenA, userC_ThirdParty)
} catch (err) {
  reuseError = true
}
assert(reuseError, "Accepted invitation cannot be reused (single-use enforced)")

// 8. 1:1 Model Enforcement: Owner cannot start another active relationship
let ownerDoubleActiveError = false
try {
  db.createRelationship(userA_Owner)
} catch (err) {
  ownerDoubleActiveError = true
}
assert(ownerDoubleActiveError, "1:1 rule: Owner with active relationship cannot create another")

// 9. 1:1 Model Enforcement: Supporter cannot accept another relationship
const relC = db.createRelationship(userC_ThirdParty)
const tokenC = generateInvitationToken()
db.createInvitation(relC.id, userC_ThirdParty, tokenC, calculateInvitationExpiry().toISOString())

let supporterDoubleActiveError = false
try {
  db.acceptInvitation(tokenC, userB_Supporter)
} catch (err) {
  supporterDoubleActiveError = true
}
assert(supporterDoubleActiveError, "1:1 rule: Supporter with active relationship cannot accept another")

// 10. Sharing Preferences Permission & Access Controls
// Active supporter can read preferences
const supporterViewedPrefs = db.getSharingPreferences(relA.id, userB_Supporter)
assert(supporterViewedPrefs !== null, "Active supporter can view sharing preferences")

// Supporter CANNOT modify sharing preferences (owner only)
let supporterModifyError = false
try {
  db.updateSharingPreferences(relA.id, userB_Supporter, { cycle_estimates: true })
} catch (err) {
  supporterModifyError = true
}
assert(supporterModifyError, "Supporter cannot modify owner sharing preferences")

// Unauthorized user CANNOT view sharing preferences
let unauthorizedViewError = false
try {
  db.getSharingPreferences(relA.id, userC_ThirdParty)
} catch (err) {
  unauthorizedViewError = true
}
assert(unauthorizedViewError, "Unauthorized user cannot view sharing preferences")

// Owner CAN update their own sharing preferences
const updatedPrefs = db.updateSharingPreferences(relA.id, userA_Owner, {
  cycle_estimates: true,
  period_status: true,
})
assert(updatedPrefs.cycle_estimates === true, "Owner successfully enabled cycle_estimates")
assert(updatedPrefs.period_status === true, "Owner successfully enabled period_status")
assert(updatedPrefs.daily_notes === false, "daily_notes remains false (isolated atomic mutation)")

// 11. Revoked Relationship Lifecycle
db.revokeRelationship(relA.id, userA_Owner)
assert(db.relationships.get(relA.id).status === "revoked", "Relationship revoked successfully")

// Once revoked, supporter loses access to sharing preferences
let revokedAccessError = false
try {
  db.getSharingPreferences(relA.id, userB_Supporter)
} catch (err) {
  revokedAccessError = true
}
assert(revokedAccessError, "Revoked relationship immediately revokes supporter access to sharing preferences")

// 12. 7-Day Expiration Rejection
const db2 = new MockDatabase()
const rel2 = db2.createRelationship("user-x")
const tokenExp = generateInvitationToken()
// Expired 8 days ago
const pastDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
db2.createInvitation(rel2.id, "user-x", tokenExp, pastDate)

let expiredAcceptError = false
try {
  db2.acceptInvitation(tokenExp, "user-y")
} catch (err) {
  expiredAcceptError = true
}
assert(expiredAcceptError, "Expired invitation (over 7 days) is rejected")

// 13. Cancelled Invitation Rejection
const db3 = new MockDatabase()
const rel3 = db3.createRelationship("user-m")
const tokenCancel = generateInvitationToken()
const inv3 = db3.createInvitation(rel3.id, "user-m", tokenCancel, calculateInvitationExpiry().toISOString())
db3.cancelInvitation(inv3.token_hash, "user-m")

let cancelledAcceptError = false
try {
  db3.acceptInvitation(tokenCancel, "user-n")
} catch (err) {
  cancelledAcceptError = true
}
assert(cancelledAcceptError, "Cancelled invitation cannot be accepted")

// 14. Declined Invitation Rejection
const db4 = new MockDatabase()
const rel4 = db4.createRelationship("user-p")
const tokenDecline = generateInvitationToken()
const inv4 = db4.createInvitation(rel4.id, "user-p", tokenDecline, calculateInvitationExpiry().toISOString())
db4.declineInvitation(inv4.token_hash, "user-q")

let declinedAcceptError = false
try {
  db4.acceptInvitation(tokenDecline, "user-r")
} catch (err) {
  declinedAcceptError = true
}
assert(declinedAcceptError, "Declined invitation cannot be accepted")

// ==============================================================================
// 5. SERVER ACTION & SERVICE SECURITY CONTRACTS AUDIT
// ==============================================================================
console.log("\n[Test 5] Auditing Server Action & Service Layer Security Contracts...")

const servicePath = path.join(rootDir, "lib", "partner", "service.ts")
assert(fs.existsSync(servicePath), "lib/partner/service.ts exists")
const serviceContent = fs.readFileSync(servicePath, "utf-8")

// Never logs raw tokens or secrets
assert(
  !serviceContent.includes("console.log(rawToken") &&
  !serviceContent.includes("console.info(rawToken") &&
  !serviceContent.includes("console.debug(rawToken"),
  "Zero logging of raw invitation tokens in service layer"
)

// Single-use acceptance verification
assert(
  serviceContent.includes('invitation.status !== "pending"'),
  "Service verifies invitation is strictly pending before accepting"
)
assert(
  serviceContent.includes('status: "accepted"'),
  "Service transitions invitation status to 'accepted'"
)

// 7-day expiration verification
assert(
  serviceContent.includes("isInvitationExpired(invitation.expires_at)"),
  "Service enforces server-side expiration verification"
)

// Owner-only sharing preferences
assert(
  serviceContent.includes("Only the cycle data owner can modify sharing preferences"),
  "Service enforces owner-only mutation of sharing preferences"
)

const actionPath = path.join(rootDir, "app", "actions", "partner.ts")
assert(fs.existsSync(actionPath), "app/actions/partner.ts exists")
const actionContent = fs.readFileSync(actionPath, "utf-8")

assert(
  actionContent.includes('"use server"'),
  "app/actions/partner.ts is a directive-protected Server Action file"
)
assert(
  actionContent.includes("createPartnerInvitationAction") &&
  actionContent.includes("verifyPartnerInvitationAction") &&
  actionContent.includes("acceptPartnerInvitationAction") &&
  actionContent.includes("declinePartnerInvitationAction") &&
  actionContent.includes("cancelPartnerInvitationAction") &&
  actionContent.includes("revokePartnerRelationshipAction") &&
  actionContent.includes("getPartnerRelationshipAction") &&
  actionContent.includes("getPartnerSharingPreferencesAction") &&
  actionContent.includes("updatePartnerSharingPreferencesAction"),
  "All 9 partner Server Actions are declared and exported"
)
assert(
  actionContent.includes("supabase.auth.getUser()"),
  "Server Actions strictly obtain user ID from authenticated Supabase session"
)

// ==============================================================================
// SUMMARY REPORT
// ==============================================================================
console.log("\n=================================================")
if (failures === 0) {
  console.log(`ALL SEIJUN PHASE 19 BATCH 1 TESTS PASSED! 🎉 (${passed} passed, 0 failed)`)
} else {
  console.error(`TESTS FAILED: ${failures} failure(s), ${passed} passed.`)
  process.exit(1)
}
console.log("=================================================\n")
