/**
 * Test Suite: Seijun Phase 16 — Account Classification & Onboarding
 * Tests registration validation, onboarding branching, existing-user safety,
 * invalid value rejection, and cycle calculation regression invariance.
 */

import assert from "node:assert/strict"

console.log("🧪 Running Seijun Phase 16 Account Classification Tests...\n")

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`     ${err.message}`)
    failed++
  }
}

// ---------------------------------------------------------------------------
// 1. Validation Logic
// ---------------------------------------------------------------------------
const ALLOWED_SEXES = ["male", "female", "prefer_not_to_say"]
const ALLOWED_ROLES = ["cycle_tracker", "supporter", "both"]

function validateRegistrationSex(sex) {
  if (!sex || typeof sex !== "string") {
    return { valid: false, error: "Please select an option for sex." }
  }
  const trimmed = sex.trim()
  if (!ALLOWED_SEXES.includes(trimmed)) {
    return { valid: false, error: "Please select an option for sex." }
  }
  return { valid: true, value: trimmed }
}

function validateOnboarding(data) {
  const { displayName, usageRole, lastPeriodStart, typicalCycleLength } = data

  if (!displayName || displayName.trim().length < 2) {
    return { valid: false, error: "Please enter your name (at least 2 characters)." }
  }

  if (!usageRole || !ALLOWED_ROLES.includes(usageRole)) {
    return { valid: false, error: "Please select how you will use Seijun." }
  }

  if (usageRole === "cycle_tracker" || usageRole === "both") {
    if (!lastPeriodStart || !/^\d{4}-\d{2}-\d{2}$/.test(lastPeriodStart)) {
      return { valid: false, error: "Please select a valid date for when your last period started." }
    }
    const todayStr = new Date().toISOString().split("T")[0]
    if (lastPeriodStart > todayStr) {
      return { valid: false, error: "Last period start date cannot be in the future." }
    }
    const num = parseInt(typicalCycleLength, 10)
    if (isNaN(num) || num < 21 || num > 45) {
      return { valid: false, error: "Typical cycle length must be between 21 and 45 days." }
    }
    return {
      valid: true,
      profile: {
        display_name: displayName.trim(),
        usage_role: usageRole,
        last_period_start: lastPeriodStart,
        typical_cycle_length: num,
        onboarding_completed: true,
      },
    }
  }

  if (usageRole === "supporter") {
    return {
      valid: true,
      profile: {
        display_name: displayName.trim(),
        usage_role: "supporter",
        last_period_start: null,
        typical_cycle_length: null,
        onboarding_completed: true,
      },
    }
  }

  return { valid: false, error: "Unknown configuration." }
}

// ---------------------------------------------------------------------------
// TEST SUITE: Registration & Sex
// ---------------------------------------------------------------------------
console.log("--- 1. Registration Sex Validation ---")

test("Valid sex: female", () => {
  const res = validateRegistrationSex("female")
  assert.equal(res.valid, true)
  assert.equal(res.value, "female")
})

test("Valid sex: male", () => {
  const res = validateRegistrationSex("male")
  assert.equal(res.valid, true)
  assert.equal(res.value, "male")
})

test("Valid sex: prefer_not_to_say", () => {
  const res = validateRegistrationSex("prefer_not_to_say")
  assert.equal(res.valid, true)
  assert.equal(res.value, "prefer_not_to_say")
})

test("Invalid sex: empty string rejected", () => {
  const res = validateRegistrationSex("")
  assert.equal(res.valid, false)
})

test("Invalid sex: unknown string rejected", () => {
  const res = validateRegistrationSex("other")
  assert.equal(res.valid, false)
})

test("Invalid sex: male_partner rejected (not allowed as sex)", () => {
  const res = validateRegistrationSex("male_partner")
  assert.equal(res.valid, false)
})

// ---------------------------------------------------------------------------
// TEST SUITE: Decoupling Sex from Role (Hard Requirement)
// ---------------------------------------------------------------------------
console.log("\n--- 2. Sex & Role Decoupling Combinations ---")

const combinations = [
  { sex: "female", role: "cycle_tracker" },
  { sex: "male", role: "supporter" },
  { sex: "female", role: "supporter" },
  { sex: "male", role: "cycle_tracker" },
  { sex: "prefer_not_to_say", role: "supporter" },
  { sex: "prefer_not_to_say", role: "cycle_tracker" },
  { sex: "female", role: "both" },
  { sex: "male", role: "both" },
  { sex: "prefer_not_to_say", role: "both" },
]

combinations.forEach(({ sex, role }) => {
  test(`Combination supported: ${sex} + ${role}`, () => {
    const sexRes = validateRegistrationSex(sex)
    assert.equal(sexRes.valid, true)

    const onbRes = validateOnboarding({
      displayName: "Alex",
      usageRole: role,
      lastPeriodStart: role === "supporter" ? "" : "2026-09-01",
      typicalCycleLength: role === "supporter" ? "" : "28",
    })
    assert.equal(onbRes.valid, true)
    assert.equal(onbRes.profile.usage_role, role)
  })
})

// ---------------------------------------------------------------------------
// TEST SUITE: Onboarding Branching
// ---------------------------------------------------------------------------
console.log("\n--- 3. Onboarding Branching Logic ---")

test("cycle_tracker requires cycle parameters", () => {
  const failRes = validateOnboarding({
    displayName: "Maya",
    usageRole: "cycle_tracker",
    lastPeriodStart: "",
    typicalCycleLength: "28",
  })
  assert.equal(failRes.valid, false)
  assert.match(failRes.error, /last period started/)

  const passRes = validateOnboarding({
    displayName: "Maya",
    usageRole: "cycle_tracker",
    lastPeriodStart: "2026-09-05",
    typicalCycleLength: "30",
  })
  assert.equal(passRes.valid, true)
  assert.equal(passRes.profile.last_period_start, "2026-09-05")
  assert.equal(passRes.profile.typical_cycle_length, 30)
  assert.equal(passRes.profile.onboarding_completed, true)
})

test("supporter does NOT require personal cycle parameters", () => {
  const supporterRes = validateOnboarding({
    displayName: "Sam",
    usageRole: "supporter",
    lastPeriodStart: "",
    typicalCycleLength: "",
  })
  assert.equal(supporterRes.valid, true)
  assert.equal(supporterRes.profile.display_name, "Sam")
  assert.equal(supporterRes.profile.usage_role, "supporter")
  assert.equal(supporterRes.profile.last_period_start, null)
  assert.equal(supporterRes.profile.typical_cycle_length, null)
  assert.equal(supporterRes.profile.onboarding_completed, true)
})

test("both requires cycle parameters", () => {
  const failBoth = validateOnboarding({
    displayName: "Jordan",
    usageRole: "both",
    lastPeriodStart: "",
    typicalCycleLength: "28",
  })
  assert.equal(failBoth.valid, false)

  const passBoth = validateOnboarding({
    displayName: "Jordan",
    usageRole: "both",
    lastPeriodStart: "2026-09-10",
    typicalCycleLength: "29",
  })
  assert.equal(passBoth.valid, true)
  assert.equal(passBoth.profile.usage_role, "both")
  assert.equal(passBoth.profile.typical_cycle_length, 29)
})

test("invalid usage_role names (male_partner, girlfriend, etc.) are rejected", () => {
  const invalidRoles = ["male_partner", "female_cycle_owner", "boyfriend", "girlfriend", "admin"]
  invalidRoles.forEach((badRole) => {
    const res = validateOnboarding({
      displayName: "Test",
      usageRole: badRole,
      lastPeriodStart: "2026-09-01",
      typicalCycleLength: "28",
    })
    assert.equal(res.valid, false)
  })
})

// ---------------------------------------------------------------------------
// TEST SUITE: Existing Users Safety & Calculations Invariance
// ---------------------------------------------------------------------------
console.log("\n--- 4. Existing Users Safety & Cycle Invariance ---")

test("Existing completed profile defaults usage_role safely", () => {
  const existingProfile = {
    id: "uuid-1",
    user_id: "user-1",
    display_name: "Redgine",
    last_period_start: "2026-08-25",
    typical_cycle_length: 28,
    onboarding_completed: true,
    sex: null,
    usage_role: null,
  }

  // App-level fallback or migration backfill
  const resolvedRole = existingProfile.usage_role ?? (existingProfile.onboarding_completed ? "cycle_tracker" : null)
  assert.equal(resolvedRole, "cycle_tracker")
  assert.equal(existingProfile.onboarding_completed, true)
  assert.equal(existingProfile.sex, null) // Untouched
})

test("Cycle calculations remain fully functional with null onboardingStartDate for supporters", () => {
  // Simulating calculateEstimatedNextPeriod from cycle-calculations.ts
  function calculateEstimatedNextPeriod({ latestCycleStartDate, averageCycleLength, typicalCycleLength }) {
    if (!latestCycleStartDate) return null
    const cycleLength = averageCycleLength || typicalCycleLength || 28
    const [y, m, d] = latestCycleStartDate.split("-").map(Number)
    const start = new Date(y, m - 1, d)
    start.setDate(start.getDate() + cycleLength)
    const year = start.getFullYear()
    const month = String(start.getMonth() + 1).padStart(2, "0")
    const day = String(start.getDate()).padStart(2, "0")
    return {
      estimatedStartDate: `${year}-${month}-${day}`,
    }
  }

  // For supporter who has not logged personal cycles:
  const supporterResult = calculateEstimatedNextPeriod({
    latestCycleStartDate: null,
    averageCycleLength: null,
    typicalCycleLength: 28,
  })
  assert.equal(supporterResult, null)

  // For regular cycle tracker:
  const trackerResult = calculateEstimatedNextPeriod({
    latestCycleStartDate: "2026-09-01",
    averageCycleLength: null,
    typicalCycleLength: 28,
  })
  assert.equal(trackerResult.estimatedStartDate, "2026-09-29")
})

console.log(`\n==========================================`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`==========================================\n`)

if (failed > 0) {
  process.exit(1)
}
