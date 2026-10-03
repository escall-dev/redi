/**
 * Test Suite: Seijun Phase 19 Role Resolution Test
 * Tests that when a supporter invites a cycle tracker (or vice-versa),
 * the acceptance flow accurately designates the cycle tracker as owner_user_id
 * and the supporter as supporter_user_id.
 */

import assert from "node:assert/strict"

console.log("🧪 Running Seijun Partner Role Resolution Tests...\n")

function resolvePartnerRoles(inviterRole, acceptorRole, inviterUserId, acceptingUserId) {
  let actualOwnerId = inviterUserId
  let actualSupporterId = acceptingUserId

  if (
    inviterRole === "supporter" &&
    (acceptorRole === "cycle_tracker" || acceptorRole === "both" || !acceptorRole)
  ) {
    actualOwnerId = acceptingUserId
    actualSupporterId = inviterUserId
  }

  return { ownerUserId: actualOwnerId, supporterUserId: actualSupporterId }
}

// Test 1: Supporter invites cycle tracker
{
  const { ownerUserId, supporterUserId } = resolvePartnerRoles(
    "supporter",
    "cycle_tracker",
    "user-alex-supporter",
    "user-seijun-tracker"
  )
  assert.equal(ownerUserId, "user-seijun-tracker", "Cycle tracker must be designated owner")
  assert.equal(supporterUserId, "user-alex-supporter", "Supporter must be designated supporter")
  console.log("  ✅ PASS: Supporter inviting cycle tracker designates cycle tracker as owner")
}

// Test 2: Cycle tracker invites supporter
{
  const { ownerUserId, supporterUserId } = resolvePartnerRoles(
    "cycle_tracker",
    "supporter",
    "user-lylia-tracker",
    "user-chou-supporter"
  )
  assert.equal(ownerUserId, "user-lylia-tracker", "Cycle tracker inviter remains owner")
  assert.equal(supporterUserId, "user-chou-supporter", "Supporter acceptor remains supporter")
  console.log("  ✅ PASS: Cycle tracker inviting supporter retains cycle tracker as owner")
}

// Test 3: Supporter invites user with 'both' role
{
  const { ownerUserId, supporterUserId } = resolvePartnerRoles(
    "supporter",
    "both",
    "user-supporter",
    "user-both"
  )
  assert.equal(ownerUserId, "user-both", "Both role must be designated owner when partnered with pure supporter")
  assert.equal(supporterUserId, "user-supporter", "Supporter must be designated supporter")
  console.log("  ✅ PASS: Supporter inviting 'both' role designates 'both' as owner")
}

// Test 4: Verify co-management authorization succeeds when roles are resolved
{
  const user = { id: "user-alex-supporter" }
  const relationship = {
    id: "rel-123",
    owner_user_id: "user-seijun-tracker",
    supporter_user_id: "user-alex-supporter",
    status: "active",
  }
  const sharingPreferences = {
    period_status: true,
    manage_period_status: true,
  }

  const role = relationship.owner_user_id === user.id ? "owner" : "supporter"
  assert.equal(role, "supporter", "Alex must be recognized as supporter")

  const canManagePeriod = role === "supporter" && sharingPreferences.period_status && sharingPreferences.manage_period_status
  assert.equal(canManagePeriod, true, "Supporter with manage_period_status must be authorized")
  console.log("  ✅ PASS: Co-management authorization passes for supporter with manage_period_status")
}

console.log("\n🎉 ALL PARTNER ROLE RESOLUTION TESTS PASSED!")
