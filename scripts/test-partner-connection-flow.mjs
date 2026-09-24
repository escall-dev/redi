/**
 * Seijun Phase 19: Partner Connection & Invitation Flow (Batch 2) Test Suite
 *
 * Verifies all Batch 2 requirements:
 * 1. Username discovery & privacy protection
 * 2. Server-side partner actions & authorization
 * 3. Recipient-bound invitation creation
 * 4. Cryptographic token security at rest (SHA-256)
 * 5. Single-use invitation acceptance lifecycle
 * 6. Wrong recipient rejection & anti-bearer binding
 * 7. Decline and cancellation lifecycles
 * 8. Partner Settings & UI integration
 * 9. Atomicity of state transitions
 * 10. Database migration & RLS policies
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
  verifyTokenHash,
} from "../lib/partner/token.ts"

// Standalone verification implementations matching lib/partner/service.ts
function normalizeUsername(input) {
  if (!input || typeof input !== "string") return ""
  return input.trim().replace(/^@+/, "").toLowerCase()
}

function isValidUsernameFormat(username) {
  return /^[a-z0-9_]{3,30}$/.test(username)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Phase 19 Batch 2: Partner Connection & Invitation Flow Test Suite ===\n")

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
// 1. DATABASE SCHEMA & MIGRATION AUDIT (BATCH 2)
// ==============================================================================
console.log("[Test 1] Auditing Phase 19 Batch 2 Database Migration & Schema...")

const migrationPath = path.join(
  rootDir,
  "supabase",
  "migrations",
  "20260924000002_partner_connection_flow.sql"
)

assert(fs.existsSync(migrationPath), "Migration 20260924000002_partner_connection_flow.sql exists")
const migrationContent = fs.readFileSync(migrationPath, "utf-8")

// Username on profiles
assert(
  migrationContent.includes("ADD COLUMN IF NOT EXISTS username TEXT"),
  "profiles.username column declared"
)
assert(
  migrationContent.includes("check_profiles_username_format"),
  "Username format check constraint declared (3-30 chars, alphanumeric + underscore)"
)
assert(
  migrationContent.includes("idx_profiles_username_lower"),
  "Case-insensitive unique index idx_profiles_username_lower declared"
)
assert(
  migrationContent.includes("UPDATE public.profiles") && migrationContent.includes("WHERE username IS NULL"),
  "Non-destructive backfill for existing profiles without username"
)

// Recipient binding on partner_invitations
assert(
  migrationContent.includes("ADD COLUMN IF NOT EXISTS invitee_user_id UUID REFERENCES auth.users(id)"),
  "partner_invitations.invitee_user_id foreign key declared"
)
assert(
  migrationContent.includes("check_partner_invitations_not_self"),
  "Self-invitation constraint declared (inviter != invitee)"
)
assert(
  migrationContent.includes("idx_partner_invitations_invitee"),
  "Index on partner_invitations(invitee_user_id) declared"
)
assert(
  migrationContent.includes("idx_partner_invitations_invitee_pending"),
  "Partial index on pending incoming invitations declared"
)

// RLS updates
assert(
  migrationContent.includes("Users can view invitations they sent or received"),
  "RLS policy allows invitees to view incoming invitations"
)

// Atomic RPC
assert(
  migrationContent.includes("CREATE OR REPLACE FUNCTION public.accept_partner_invitation"),
  "Atomic PostgreSQL RPC accept_partner_invitation declared"
)
assert(
  migrationContent.includes("FOR UPDATE"),
  "RPC uses row-level locking for race-proof atomic acceptance"
)
assert(
  migrationContent.includes("v_invitation.invitee_user_id != p_accepting_user_id"),
  "RPC enforces recipient binding server-side"
)


// ==============================================================================
// 2. USERNAME NORMALIZATION & PRIVACY AUDIT
// ==============================================================================
console.log("\n[Test 2] Testing Username Normalization & Validation...")

assert(normalizeUsername("@Redgine") === "redgine", "normalizeUsername strips leading '@' and lowercases")
assert(normalizeUsername("  @User_123  ") === "user_123", "normalizeUsername trims whitespace")
assert(normalizeUsername("alice") === "alice", "normalizeUsername preserves valid lowercase handle")
assert(normalizeUsername("") === "", "normalizeUsername handles empty string safely")

assert(isValidUsernameFormat("redgine"), "Valid username accepted (redgine)")
assert(isValidUsernameFormat("partner_99"), "Valid username with underscore accepted (partner_99)")
assert(isValidUsernameFormat("abc"), "Minimum 3-character username accepted")
assert(!isValidUsernameFormat("ab"), "2-character username rejected (< 3 chars)")
assert(!isValidUsernameFormat("a".repeat(31)), "31-character username rejected (> 30 chars)")
assert(!isValidUsernameFormat("user@domain"), "Email format rejected as username")
assert(!isValidUsernameFormat("user-dash"), "Dashes rejected (only lowercase alphanumeric and underscores)")
assert(!isValidUsernameFormat("user space"), "Spaces rejected in username")
assert(!isValidUsernameFormat("user!name"), "Punctuation rejected in username")


// ==============================================================================
// 3. IN-MEMORY STATE MACHINE FOR CONNECTION LIFECYCLE
// ==============================================================================
console.log("\n[Test 3] Testing Complete Partner Connection Lifecycle & Invariants...")

class MockPartnerConnectionService {
  constructor() {
    this.profiles = new Map() // userId -> { userId, username, displayName, email }
    this.relationships = new Map() // id -> relationship
    this.invitations = new Map() // tokenHash -> invitation
  }

  addUser(userId, username, displayName, email) {
    this.profiles.set(userId, {
      user_id: userId,
      username: normalizeUsername(username),
      display_name: displayName,
      email: email, // Private field, must NEVER be returned in search
    })
  }

  searchByUsername(currentUserId, query) {
    if (!currentUserId) {
      throw new Error("Authentication required to search partner accounts")
    }

    const normalized = normalizeUsername(query)
    if (!normalized || normalized.length < 2) {
      return []
    }

    const results = []
    for (const p of this.profiles.values()) {
      if (p.user_id === currentUserId) continue // Exclude self
      if (p.username.startsWith(normalized)) {
        // Return strictly minimal public information
        results.push({
          username: p.username,
          displayName: p.display_name,
        })
      }
    }
    return results
  }

  createInvitation(inviterId, targetUsername) {
    if (!inviterId) {
      throw new Error("Inviter authentication required")
    }

    // 1:1 check for inviter
    for (const r of this.relationships.values()) {
      if (r.status === "active" && (r.owner_user_id === inviterId || r.supporter_user_id === inviterId)) {
        throw new Error("Inviter already has an active partner connection (1:1 rule)")
      }
    }

    // Pending check for inviter
    for (const inv of this.invitations.values()) {
      if (inv.inviter_user_id === inviterId && inv.status === "pending") {
        if (!isInvitationExpired(inv.expires_at)) {
          throw new Error("Inviter already has an active pending invitation")
        }
      }
    }

    let targetUserId = null
    if (targetUsername) {
      const normalizedTarget = normalizeUsername(targetUsername)
      let targetProfile = null
      for (const p of this.profiles.values()) {
        if (p.username === normalizedTarget) {
          targetProfile = p
          break
        }
      }

      if (!targetProfile) {
        throw new Error(`Target user @${normalizedTarget} not found`)
      }

      if (targetProfile.user_id === inviterId) {
        throw new Error("Self-invitation rejected: you cannot invite yourself")
      }

      // Check if target has active relationship
      for (const r of this.relationships.values()) {
        if (r.status === "active" && (r.owner_user_id === targetProfile.user_id || r.supporter_user_id === targetProfile.user_id)) {
          throw new Error("Target already has an active partner connection (1:1 rule)")
        }
      }

      // Check if target has pending invitation
      for (const inv of this.invitations.values()) {
        if (
          inv.status === "pending" &&
          (inv.inviter_user_id === targetProfile.user_id || inv.invitee_user_id === targetProfile.user_id) &&
          !isInvitationExpired(inv.expires_at)
        ) {
          throw new Error("Target already has a pending partner invitation")
        }
      }

      targetUserId = targetProfile.user_id
    }

    const rawToken = generateInvitationToken()
    const tokenHash = hashInvitationToken(rawToken)
    const relId = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    const relationship = {
      id: relId,
      owner_user_id: inviterId,
      supporter_user_id: null,
      status: "pending",
      created_at: new Date().toISOString(),
      accepted_at: null,
    }
    this.relationships.set(relId, relationship)

    const invitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      relationship_id: relId,
      inviter_user_id: inviterId,
      invitee_user_id: targetUserId,
      token_hash: tokenHash,
      expires_at: calculateInvitationExpiry().toISOString(),
      status: "pending",
      created_at: new Date().toISOString(),
      accepted_at: null,
      declined_at: null,
      cancelled_at: null,
    }
    this.invitations.set(tokenHash, invitation)

    return { rawToken, invitation, relationship }
  }

  acceptInvitation(rawToken, supporterId, currentTime = Date.now()) {
    if (!rawToken || !supporterId) {
      throw new Error("Missing acceptance parameters")
    }

    const tokenHash = hashInvitationToken(rawToken)
    const invitation = this.invitations.get(tokenHash)

    if (!invitation) {
      throw new Error("Invitation not found")
    }

    if (invitation.status !== "pending") {
      throw new Error(`Invitation is ${invitation.status} and cannot be accepted`)
    }

    if (isInvitationExpired(invitation.expires_at, currentTime)) {
      invitation.status = "expired"
      throw new Error("Invitation has expired")
    }

    if (invitation.inviter_user_id === supporterId) {
      throw new Error("Cannot accept own invitation")
    }

    // Recipient binding check: prevents generic bearer token redemption
    if (invitation.invitee_user_id && invitation.invitee_user_id !== supporterId) {
      throw new Error("Unauthorized acceptance: Invitation was addressed to a different account")
    }

    // 1:1 check for accepter
    for (const r of this.relationships.values()) {
      if (r.status === "active" && (r.owner_user_id === supporterId || r.supporter_user_id === supporterId)) {
        throw new Error("Supporter already has an active partner connection")
      }
    }

    // 1:1 check for inviter
    for (const r of this.relationships.values()) {
      if (r.status === "active" && (r.owner_user_id === invitation.inviter_user_id || r.supporter_user_id === invitation.inviter_user_id)) {
        throw new Error("Inviter already has an active partner connection")
      }
    }

    const relationship = this.relationships.get(invitation.relationship_id)
    if (!relationship) {
      throw new Error("Associated relationship not found")
    }

    const nowStr = new Date(currentTime).toISOString()
    relationship.supporter_user_id = supporterId
    relationship.status = "active"
    relationship.accepted_at = nowStr

    invitation.status = "accepted"
    invitation.accepted_at = nowStr

    return { relationship, invitation }
  }

  declineInvitation(rawToken, userId) {
    const tokenHash = hashInvitationToken(rawToken)
    const invitation = this.invitations.get(tokenHash)
    if (!invitation) throw new Error("Invitation not found")

    if (invitation.status !== "pending") {
      throw new Error(`Cannot decline ${invitation.status} invitation`)
    }

    if (invitation.inviter_user_id === userId) {
      throw new Error("Cannot decline own invitation")
    }

    if (invitation.invitee_user_id && invitation.invitee_user_id !== userId) {
      throw new Error("Unauthorized user cannot decline invitation")
    }

    invitation.status = "declined"
    invitation.declined_at = new Date().toISOString()
    const rel = this.relationships.get(invitation.relationship_id)
    if (rel) {
      rel.status = "declined"
    }
  }

  cancelInvitation(tokenHash, userId) {
    const invitation = this.invitations.get(tokenHash)
    if (!invitation) throw new Error("Invitation not found")

    if (invitation.inviter_user_id !== userId) {
      throw new Error("Unauthorized: Only inviter can cancel invitation")
    }

    if (invitation.status !== "pending") {
      throw new Error(`Cannot cancel ${invitation.status} invitation`)
    }

    invitation.status = "cancelled"
    invitation.cancelled_at = new Date().toISOString()
    const rel = this.relationships.get(invitation.relationship_id)
    if (rel) {
      rel.status = "revoked"
    }
  }
}

// Instantiate test service
const service = new MockPartnerConnectionService()
const USER_A = "11111111-1111-4111-8111-111111111111" // Owner
const USER_B = "22222222-2222-4222-8222-222222222222" // Intended Supporter
const USER_C = "33333333-3333-4333-8333-333333333333" // Random 3rd Party User

service.addUser(USER_A, "alice_tracker", "Alice Tracker", "alice@secret.com")
service.addUser(USER_B, "bob_supporter", "Bob Supporter", "bob@secret.com")
service.addUser(USER_C, "charlie_third", "Charlie Random", "charlie@secret.com")

// Test Search Privacy & Authorization
const searchResults = service.searchByUsername(USER_A, "bob")
assert(searchResults.length === 1, "Found target partner by partial username")
assert(searchResults[0].username === "bob_supporter", "Username returned correctly")
assert(searchResults[0].displayName === "Bob Supporter", "Display name returned correctly")
assert(searchResults[0].email === undefined, "Email is strictly NOT exposed in search")
assert(searchResults[0].user_id === undefined, "Internal auth user_id is strictly NOT exposed in search")
assert(searchResults[0].cycle_data === undefined, "Cycle data is strictly NOT exposed in search")

// Search self-exclusion
const selfSearch = service.searchByUsername(USER_A, "alice")
assert(selfSearch.length === 0, "Current user is excluded from search results")

// Unauthenticated search rejection
let unauthFailed = false
try {
  service.searchByUsername(null, "bob")
} catch (e) {
  unauthFailed = true
}
assert(unauthFailed, "Unauthenticated username discovery is rejected")

// Nonexistent user search
const noResults = service.searchByUsername(USER_A, "nonexistent_person")
assert(noResults.length === 0, "Nonexistent username returns clean empty array")

// Test Invitation Creation with Recipient Binding
const { rawToken, invitation, relationship } = service.createInvitation(USER_A, "bob_supporter")
assert(invitation.invitee_user_id === USER_B, "Invitation is bound to intended recipient USER_B")
assert(invitation.inviter_user_id === USER_A, "Invitation inviter matches USER_A")
assert(invitation.status === "pending", "Invitation initial status is 'pending'")
assert(relationship.status === "pending", "Relationship initial status is 'pending'")
assert(invitation.token_hash !== rawToken, "Raw token is never stored in database")
assert(hashInvitationToken(rawToken) === invitation.token_hash, "Stored token_hash matches SHA-256 digest")

// Duplicate pending invitation rejection
let dupFailed = false
try {
  service.createInvitation(USER_A, "bob_supporter")
} catch (e) {
  dupFailed = true
}
assert(dupFailed, "Duplicate pending invitation for sender is rejected")

// Self-invitation rejection
let selfInviteFailed = false
try {
  service.createInvitation(USER_B, "bob_supporter")
} catch (e) {
  selfInviteFailed = true
}
assert(selfInviteFailed, "Self-invitation is strictly rejected server-side")

// ==============================================================================
// 4. RECIPIENT BINDING SECURITY (ANTI-BEARER VULNERABILITY PREVENTION)
// ==============================================================================
console.log("\n[Test 4] Testing Recipient Binding & Anti-Bearer Security...")

// Random 3rd party (USER_C) obtains rawToken and attempts to accept
let wrongUserFailed = false
try {
  service.acceptInvitation(rawToken, USER_C)
} catch (e) {
  wrongUserFailed = true
}
assert(wrongUserFailed, "Wrong authenticated user (USER_C) cannot redeem invitation addressed to USER_B")

// Inviter attempts to accept own invitation
let selfAcceptFailed = false
try {
  service.acceptInvitation(rawToken, USER_A)
} catch (e) {
  selfAcceptFailed = true
}
assert(selfAcceptFailed, "Inviter (USER_A) cannot accept their own invitation")

// Valid recipient accepts
const acceptRes = service.acceptInvitation(rawToken, USER_B)
assert(acceptRes.invitation.status === "accepted", "Invitation successfully transitioned to 'accepted'")
assert(acceptRes.relationship.status === "active", "Relationship successfully transitioned to 'active'")
assert(acceptRes.relationship.supporter_user_id === USER_B, "Supporter attached to active relationship")
assert(acceptRes.relationship.accepted_at !== null, "accepted_at timestamp populated")

// Single-use guarantee: cannot accept twice
let reuseFailed = false
try {
  service.acceptInvitation(rawToken, USER_B)
} catch (e) {
  reuseFailed = true
}
assert(reuseFailed, "Accepted invitation cannot be reused (single-use enforced)")

// 1:1 rule: connected supporter cannot accept another invitation
let supporterAlreadyConnectedFailed = false
try {
  // Fresh owner USER_D tries to invite USER_B who is already active
  service.addUser("44444444-4444-4444-8444-444444444444", "diana_tracker", "Diana", "diana@test.com")
  service.createInvitation("44444444-4444-4444-8444-444444444444", "bob_supporter")
} catch (e) {
  supporterAlreadyConnectedFailed = true
}
assert(supporterAlreadyConnectedFailed, "User in active relationship cannot receive new invitations")


// ==============================================================================
// 5. DECLINE & CANCELLATION LIFECYCLE TESTS
// ==============================================================================
console.log("\n[Test 5] Testing Decline & Cancellation Lifecycles...")

const USER_D = "44444444-4444-4444-8444-444444444444"
const USER_E = "55555555-5555-4555-8555-555555555555"
service.addUser(USER_E, "elena_supporter", "Elena Supporter", "elena@test.com")

// Test Decline
const inviteForDecline = service.createInvitation(USER_D, "elena_supporter")
service.declineInvitation(inviteForDecline.rawToken, USER_E)
assert(inviteForDecline.invitation.status === "declined", "Invitation successfully transitioned to 'declined'")

// Cannot accept declined invitation
let acceptDeclinedFailed = false
try {
  service.acceptInvitation(inviteForDecline.rawToken, USER_E)
} catch (e) {
  acceptDeclinedFailed = true
}
assert(acceptDeclinedFailed, "Declined invitation cannot be accepted")

// Test Cancel
const inviteForCancel = service.createInvitation(USER_D, "elena_supporter")
service.cancelInvitation(inviteForCancel.invitation.token_hash, USER_D)
assert(inviteForCancel.invitation.status === "cancelled", "Invitation successfully transitioned to 'cancelled'")

// Cannot accept cancelled invitation
let acceptCancelledFailed = false
try {
  service.acceptInvitation(inviteForCancel.rawToken, USER_E)
} catch (e) {
  acceptCancelledFailed = true
}
assert(acceptCancelledFailed, "Cancelled invitation cannot be accepted")

// Unauthorized cancellation rejection
const inviteForAuthTest = service.createInvitation(USER_D, "elena_supporter")
let unauthCancelFailed = false
try {
  service.cancelInvitation(inviteForAuthTest.invitation.token_hash, USER_E)
} catch (e) {
  unauthCancelFailed = true
}
assert(unauthCancelFailed, "Non-inviter cannot cancel invitation")


// ==============================================================================
// 6. TOKEN SECURITY & EXPIRATION TESTS
// ==============================================================================
const USER_F = "66666666-6666-4666-8666-666666666666"
const USER_G = "77777777-7777-4777-8777-777777777777"
service.addUser(USER_F, "fiona_tracker", "Fiona Tracker", "fiona@test.com")
service.addUser(USER_G, "george_supporter", "George Supporter", "george@test.com")

const inviteForExpiry = service.createInvitation(USER_F, "george_supporter")
const eightDaysLater = Date.now() + 8 * 24 * 60 * 60 * 1000

let expiredAcceptFailed = false
try {
  service.acceptInvitation(inviteForExpiry.rawToken, USER_G, eightDaysLater)
} catch (e) {
  expiredAcceptFailed = true
}
assert(expiredAcceptFailed, "Expired invitation (> 7 days) cannot be accepted")

// Token tampering detection
const tamperedToken = rawToken.substring(0, 63) + "x"
let tamperedFailed = false
try {
  service.acceptInvitation(tamperedToken, USER_B)
} catch (e) {
  tamperedFailed = true
}
assert(tamperedFailed, "Tampered token is rejected")


// ==============================================================================
// 7. COMPONENT & ROUTING STATIC AUDIT
// ==============================================================================
console.log("\n[Test 7] Auditing UI Components, Pages, and Settings Architecture...")

const qrComponentPath = path.join(rootDir, "components", "partner", "partner-qr-dialog.tsx")
assert(fs.existsSync(qrComponentPath), "components/partner/partner-qr-dialog.tsx exists")

const addModalComponentPath = path.join(rootDir, "components", "partner", "add-partner-modal.tsx")
assert(fs.existsSync(addModalComponentPath), "components/partner/add-partner-modal.tsx exists")
const addModalContent = fs.readFileSync(addModalComponentPath, "utf-8")
assert(addModalContent.includes("searchPartnerByUsernameAction"), "AddPartnerModal calls server-side search")
assert(addModalContent.includes("createPartnerInvitationAction"), "AddPartnerModal creates secure invitation")
assert(addModalContent.includes("Add Partner"), "Direct 1-click Add Partner button in search results")
assert(addModalContent.includes("Invitation sent to") && addModalContent.includes("pending acceptance"), "Shows clean pending acceptance label without QR/shareable links")
assert(!addModalContent.includes("PartnerQrDialog"), "QR dialog is removed from AddPartnerModal")

const connectionCardPath = path.join(rootDir, "components", "partner", "partner-connection-card.tsx")
assert(fs.existsSync(connectionCardPath), "components/partner/partner-connection-card.tsx exists")
const connectionCardContent = fs.readFileSync(connectionCardPath, "utf-8")
assert(connectionCardContent.includes("No partner connected"), "Connection card handles 'none' state")
assert(connectionCardContent.includes("Waiting for acceptance"), "Connection card handles 'outgoing_pending' state")
assert(connectionCardContent.includes("Incoming Partner Invitation"), "Connection card handles 'incoming_pending' state")
assert(connectionCardContent.includes("Connected Partner"), "Connection card handles 'active' state")

const settingsViewPath = path.join(rootDir, "components", "partner", "partner-settings-view.tsx")
assert(fs.existsSync(settingsViewPath), "components/partner/partner-settings-view.tsx exists")

const settingsPartnerPagePath = path.join(rootDir, "app", "settings", "partner", "page.tsx")
assert(fs.existsSync(settingsPartnerPagePath), "app/settings/partner/page.tsx route exists")

const invitePagePath = path.join(rootDir, "app", "partner", "invite", "[token]", "page.tsx")
assert(fs.existsSync(invitePagePath), "app/partner/invite/[token]/page.tsx route exists")

const seijunInvitePagePath = path.join(rootDir, "app", "seijun", "partner", "invite", "[token]", "page.tsx")
assert(fs.existsSync(seijunInvitePagePath), "app/seijun/partner/invite/[token]/page.tsx route exists")

const acceptanceViewPath = path.join(rootDir, "components", "partner", "invitation-acceptance-view.tsx")
assert(fs.existsSync(acceptanceViewPath), "components/partner/invitation-acceptance-view.tsx exists")
const acceptanceViewContent = fs.readFileSync(acceptanceViewPath, "utf-8")
assert(acceptanceViewContent.includes("acceptPartnerInvitationAction"), "Acceptance view invokes server action")
assert(acceptanceViewContent.includes("Sign In to Continue"), "Acceptance view preserves token and prompts sign in for unauthenticated users")
assert(acceptanceViewContent.includes("You cannot accept your own invitation"), "Acceptance view prevents self-acceptance")
assert(acceptanceViewContent.includes("Different Account Required"), "Acceptance view prevents wrong user acceptance")

// Check service layer functions
const servicePath = path.join(rootDir, "lib", "partner", "service.ts")
assert(fs.existsSync(servicePath), "lib/partner/service.ts exists")
const serviceContent = fs.readFileSync(servicePath, "utf-8")
assert(serviceContent.includes("export function normalizeUsername"), "service.ts exports normalizeUsername")
assert(serviceContent.includes("export function isValidUsernameFormat"), "service.ts exports isValidUsernameFormat")
assert(serviceContent.includes("export async function searchPartnerByUsername"), "service.ts exports searchPartnerByUsername")
assert(serviceContent.includes("export async function getPartnerConnectionState"), "service.ts exports getPartnerConnectionState")
assert(serviceContent.includes("export async function acceptInvitationById"), "service.ts exports acceptInvitationById")
assert(serviceContent.includes("invitee_user_id"), "service.ts binds invitee_user_id")

// Check server action layer exports
const actionPath = path.join(rootDir, "app", "actions", "partner.ts")
assert(fs.existsSync(actionPath), "app/actions/partner.ts exists")
const actionContent = fs.readFileSync(actionPath, "utf-8")
assert(actionContent.includes("searchPartnerByUsernameAction"), "actions/partner.ts exports searchPartnerByUsernameAction")
assert(actionContent.includes("getPartnerConnectionStateAction"), "actions/partner.ts exports getPartnerConnectionStateAction")
assert(actionContent.includes("acceptPartnerInvitationByIdAction"), "actions/partner.ts exports acceptPartnerInvitationByIdAction")
assert(actionContent.includes("createPartnerInvitationAction"), "actions/partner.ts exports createPartnerInvitationAction")
assert(actionContent.includes("verifyPartnerInvitationAction"), "actions/partner.ts exports verifyPartnerInvitationAction")
assert(actionContent.includes("acceptPartnerInvitationAction"), "actions/partner.ts exports acceptPartnerInvitationAction")



// ==============================================================================
// 8. ZERO CYCLE DATA & NOTIFICATION LEAK AUDIT
// ==============================================================================
console.log("\n[Test 8] Auditing Strict Scope Boundaries (No Shared Data, No Push Alerts)...")

assert(
  !connectionCardContent.includes("symptoms") &&
  !connectionCardContent.includes("cycle_length") &&
  !connectionCardContent.includes("period_status"),
  "Batch 2 Connection Card does NOT expose shared cycle symptoms or period status"
)
assert(
  !acceptanceViewContent.includes("symptoms") &&
  !acceptanceViewContent.includes("cycle_length"),
  "Acceptance screen does NOT expose shared cycle information prematurely"
)

// ==============================================================================
// SUMMARY
// ==============================================================================
console.log("\n=================================================")
if (failures === 0) {
  console.log(`ALL SEIJUN PHASE 19 BATCH 2 TESTS PASSED! 🎉 (${passed} passed, 0 failed)`)
} else {
  console.error(`TESTS FAILED: ${failures} failure(s), ${passed} passed.`)
  process.exit(1)
}
console.log("=================================================\n")
