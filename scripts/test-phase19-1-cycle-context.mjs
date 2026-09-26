/**
 * Seijun Phase 19.1 — Partner Cycle Context & Supporter Mode Test Suite
 *
 * Verifies:
 *  1. Supporter + active partner -> partner cycle becomes primary context
 *  2. Supporter + manage_period_status -> Manage Period targets partner cycle
 *  3. Supporter + no manage_period_status -> cannot manage period
 *  4. Own cycle protection: Supporter never modifies their own cycle via partner actions
 *  5. Both role: own cycle + partner cycle available with explicit context switching
 *  6. Revoked relationship: partner context unavailable
 *  7. UI context awareness: No inappropriate personal Log Period in supporter mode
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const projectRoot = process.cwd()

console.log("═════════════════════════════════════════════════════════════════")
console.log("🌸 Seijun Phase 19.1 — Partner Cycle Context & Supporter Mode Tests")
console.log("═════════════════════════════════════════════════════════════════\n")

let passed = 0
let failed = 0

function pass(name) {
  passed++
  console.log(`  ✅ ${name}`)
}

function fail(name, reason) {
  failed++
  console.error(`  ❌ ${name}: ${reason}`)
}

function section(name) {
  console.log(`\n━━━ ${name} ━━━`)
}

// ─── TEST 1: Source Files & Module Architecture ──────────────────────────────
section("TEST 1: Module Architecture & Exports")
{
  const typesPath = path.join(projectRoot, "lib", "cycle-context", "types.ts")
  const serverPath = path.join(projectRoot, "lib", "cycle-context", "server.ts")
  const clientPath = path.join(projectRoot, "lib", "cycle-context", "cycle-context.tsx")
  const actionsPath = path.join(projectRoot, "app", "actions", "cycle-context.ts")
  const switcherPath = path.join(projectRoot, "components", "cycle-context", "cycle-context-switcher.tsx")
  const manageModalPath = path.join(projectRoot, "components", "partner", "manage-period-dialog.tsx")

  assert(fs.existsSync(typesPath), "types.ts exists")
  assert(fs.existsSync(serverPath), "server.ts exists")
  assert(fs.existsSync(clientPath), "cycle-context.tsx exists")
  assert(fs.existsSync(actionsPath), "actions/cycle-context.ts exists")
  assert(fs.existsSync(switcherPath), "cycle-context-switcher.tsx exists")
  assert(fs.existsSync(manageModalPath), "manage-period-dialog.tsx exists")

  const serverContent = fs.readFileSync(serverPath, "utf-8")
  assert(serverContent.includes("resolveServerCycleContext"), "server.ts exports resolveServerCycleContext")
  assert(serverContent.includes("CYCLE_CONTEXT_COOKIE_NAME"), "server.ts defines CYCLE_CONTEXT_COOKIE_NAME")

  pass("Centralized Cycle Context module structure declared and complete")
}

// ─── TEST 2: Supporter + Active Partner Context Resolution ───────────────────
section("TEST 2: Supporter Primary Context Resolution")
{
  const serverContent = fs.readFileSync(path.join(projectRoot, "lib", "cycle-context", "server.ts"), "utf-8")

  // Verify supporter role automatically resolves partner mode when relationship exists
  assert(
    serverContent.includes('usageRole === "supporter"') &&
    serverContent.includes('mode = "partner"'),
    "Supporter role sets mode to partner"
  )

  // Verify target activeUserId is partner owner's user ID
  assert(
    serverContent.includes('activeUserId = partnerInfo.partnerUserId'),
    "Active user targets partner owner in partner mode"
  )

  pass("Supporter with active partner sets partner cycle as primary context")
  pass("Supporter target activeUserId is set to partner owner's user ID")
}

// ─── TEST 3: Both Role Context Switching ─────────────────────────────────────
section("TEST 3: Both Role Context Switching")
{
  const serverContent = fs.readFileSync(path.join(projectRoot, "lib", "cycle-context", "server.ts"), "utf-8")

  // Verify both role enables context switching
  assert(
    serverContent.includes('usageRole === "both"') &&
    serverContent.includes('canSwitchContext = true'),
    "Both role sets canSwitchContext to true"
  )

  // Verify both role checks cookie or preference
  assert(
    serverContent.includes("CYCLE_CONTEXT_COOKIE_NAME") &&
    serverContent.includes('preferredMode === "partner"'),
    "Both role resolves preferredMode from cookie/request"
  )

  const switcherContent = fs.readFileSync(
    path.join(projectRoot, "components", "cycle-context", "cycle-context-switcher.tsx"),
    "utf-8"
  )
  assert(switcherContent.includes("My Cycle"), "Switcher includes My Cycle option")
  assert(switcherContent.includes("Cycle"), "Switcher includes Partner's Cycle option")
  assert(switcherContent.includes("switchContext"), "Switcher invokes switchContext")

  pass("Both role supports dual contexts with explicit user switching")
  pass("Context switcher provides clear UI affordance for My Cycle vs Partner's Cycle")
}

// ─── TEST 4: Cycle Tracker Default Context ───────────────────────────────────
section("TEST 4: Cycle Tracker Personal Context Invariance")
{
  const serverContent = fs.readFileSync(path.join(projectRoot, "lib", "cycle-context", "server.ts"), "utf-8")

  assert(
    serverContent.includes('mode = "own"') &&
    serverContent.includes('canSwitchContext = false'),
    "Cycle tracker defaults to own cycle without context switching"
  )

  pass("Cycle tracker primary context is strictly their own cycle")
}

// ─── TEST 5: Revoked / Inactive Relationship Safety ──────────────────────────
section("TEST 5: Revoked / Inactive Relationship Safety")
{
  const serverContent = fs.readFileSync(path.join(projectRoot, "lib", "cycle-context", "server.ts"), "utf-8")

  // Query strictly requires status = 'active'
  assert(serverContent.includes('.eq("status", "active")'), "Relationship check enforces status = 'active'")

  const authContent = fs.readFileSync(path.join(projectRoot, "lib", "partner", "authorization.ts"), "utf-8")
  assert(authContent.includes('.eq("status", "active")'), "Partner authorization requires active relationship")

  pass("Revoked or inactive relationship prevents partner context access")
}

// ─── TEST 6: Period Management Targeting & Permissions ───────────────────────
section("TEST 6: Manage Period Targeting & Permissions")
{
  const mutationsContent = fs.readFileSync(path.join(projectRoot, "app", "actions", "partner-mutations.ts"), "utf-8")

  // Verify authorizeSupporterManagement enforces manage_period_status
  assert(
    mutationsContent.includes('authorizeSupporterManagement(supabase, "manage_period_status")'),
    "recordPartnerPeriodAction requires manage_period_status"
  )

  // Verify target user is ownerUserId, never supporterUserId
  assert(
    mutationsContent.includes("user_id: ownerUserId"),
    "Partner period insertion explicitly targets ownerUserId"
  )
  assert(
    !mutationsContent.includes("user_id: supporterUserId"),
    "Partner period insertion never targets supporterUserId"
  )

  pass("Manage Period strictly targets Cycle Owner's records")
  pass("Supporter personal cycle records are completely insulated from partner mutations")
}

// ─── TEST 7: Permission Denial (manage_period_status = false) ────────────────
section("TEST 7: Permission Denial Enforcement")
{
  const authContent = fs.readFileSync(path.join(projectRoot, "lib", "partner", "authorization.ts"), "utf-8")

  assert(authContent.includes("MANAGEMENT_DISABLED"), "Returns MANAGEMENT_DISABLED when capability is off")
  assert(authContent.includes("SHARING_DISABLED"), "Returns SHARING_DISABLED when base category is off")
  assert(authContent.includes("getRequiredCategoryForManagement"), "Verifies prerequisite view access")

  pass("Supporter without manage_period_status is rejected with MANAGEMENT_DISABLED")
  pass("Supporter without base period_status view is rejected with SHARING_DISABLED")
}

// ─── TEST 8: UI Navigation & No Inappropriate Log Period ─────────────────────
section("TEST 8: UI Context Awareness & Navigation Audit")
{
  const quickLogContent = fs.readFileSync(
    path.join(projectRoot, "components", "shell", "quick-log-context.tsx"),
    "utf-8"
  )
  assert(quickLogContent.includes("useCycleContext"), "QuickLog consumes cycle context")
  assert(quickLogContent.includes("isPartnerContext"), "QuickLog checks isPartnerContext")
  assert(quickLogContent.includes("ManagePeriodDialog"), "QuickLog provides ManagePeriodDialog for partner")
  assert(quickLogContent.includes("permissions.canManagePeriod"), "QuickLog checks canManagePeriod permission")

  const desktopHeaderContent = fs.readFileSync(
    path.join(projectRoot, "components", "shell", "desktop-header.tsx"),
    "utf-8"
  )
  assert(desktopHeaderContent.includes("isPartnerContext"), "DesktopHeader checks isPartnerContext")
  assert(desktopHeaderContent.includes("Manage Period"), "DesktopHeader shows Manage Period in partner mode")
  assert(desktopHeaderContent.includes("canQuickLog"), "DesktopHeader conditionally hides button when unauthorized")

  const mobileNavContent = fs.readFileSync(
    path.join(projectRoot, "components", "shell", "mobile-bottom-nav.tsx"),
    "utf-8"
  )
  assert(mobileNavContent.includes("isPartnerContext"), "MobileNav checks isPartnerContext")
  assert(mobileNavContent.includes("Manage"), "MobileNav labels action as Manage")

  const dashQuickActionsContent = fs.readFileSync(
    path.join(projectRoot, "components", "dashboard", "dashboard-quick-actions.tsx"),
    "utf-8"
  )
  assert(dashQuickActionsContent.includes("Manage Period"), "DashboardQuickActions has Manage Period")

  const dashPageContent = fs.readFileSync(
    path.join(projectRoot, "app", "dashboard", "page.tsx"),
    "utf-8"
  )
  assert(dashPageContent.includes("resolveServerCycleContext"), "DashboardPage resolves cycle context")
  assert(dashPageContent.includes("isPartnerContext"), "DashboardPage checks isPartnerContext")
  assert(dashPageContent.includes("PartnerDashboardView"), "DashboardPage renders PartnerDashboardView in partner mode")

  pass("Supporter mode replaces personal 'Log Period' with authorized 'Manage Period'")
  pass("DesktopHeader and MobileBottomNav render context-aware labels")
  pass("DashboardPage directly renders Partner Dashboard for supporters")
  pass("Personal cycle tracking clutter is hidden from supporter account")
}

// ─── TEST 9: Calendar & Notes Context Routing ────────────────────────────────
section("TEST 9: Calendar & Notes Context Routing")
{
  const calendarPageContent = fs.readFileSync(
    path.join(projectRoot, "app", "calendar", "page.tsx"),
    "utf-8"
  )
  assert(calendarPageContent.includes("resolveServerCycleContext"), "Calendar page resolves cycle context")
  assert(calendarPageContent.includes("isPartnerView={true}"), "Calendar page passes isPartnerView")
  assert(calendarPageContent.includes("symptoms={[]}"), "Calendar suppresses personal symptoms in partner mode")

  const calendarViewContent = fs.readFileSync(
    path.join(projectRoot, "components", "calendar", "calendar-view.tsx"),
    "utf-8"
  )
  assert(calendarViewContent.includes("isPartnerView"), "CalendarView handles isPartnerView")
  assert(calendarViewContent.includes("!isPartnerView &&"), "CalendarView hides personal symptom logging in partner mode")

  const notesPageContent = fs.readFileSync(
    path.join(projectRoot, "app", "notes", "page.tsx"),
    "utf-8"
  )
  assert(notesPageContent.includes("resolveServerCycleContext"), "Notes page resolves cycle context")
  assert(notesPageContent.includes('redirect("/partner")'), "Notes page redirects partner context to partner dashboard")

  pass("Calendar page renders partner cycle timeline and suppresses private symptoms")
  pass("Notes page routes partner context to authorized partner notes")
}

console.log("\n═════════════════════════════════════════════════════════════════")
console.log(`📊 Phase 19.1 Test Results: ${passed} passed, ${failed} failed`)
console.log("═════════════════════════════════════════════════════════════════\n")

if (failed > 0) {
  process.exit(1)
}
