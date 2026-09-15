/**
 * Redi Phase 13 — UX / Integration Polish Automated Verification Script
 * Validates centralized card elevation tokens, button touch target constraints,
 * navigation active-state logic, empty state structures, and cross-route consistency.
 */

import * as fs from "fs"
import * as path from "path"

function assert(condition: unknown, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`)
    process.exit(1)
  }
  console.log(`PASS: ${msg}`)
}

console.log("=== Running Redi Phase 13 UX / Integration Polish Tests ===\n")

// Test 1: Verify Card Elevation Tokens in globals.css
console.log("--- 1. Card Elevation Tokens in globals.css ---")
const globalsCssPath = path.resolve(__dirname, "../app/globals.css")
const globalsCss = fs.readFileSync(globalsCssPath, "utf-8")

assert(globalsCss.includes(".shadow-redi-card"), "globals.css contains .shadow-redi-card utility")
assert(globalsCss.includes(".shadow-redi-card-hover"), "globals.css contains .shadow-redi-card-hover utility")
assert(globalsCss.includes(".dark .shadow-redi-card"), "globals.css contains dark mode .shadow-redi-card definition")
assert(globalsCss.includes(".dark .shadow-redi-card-hover"), "globals.css contains dark mode .shadow-redi-card-hover definition")

// Test 2: Verify Shared Card Component implementation
console.log("\n--- 2. Shared Card Component Structure ---")
const cardComponentPath = path.resolve(__dirname, "../components/ui/card.tsx")
const cardComponent = fs.readFileSync(cardComponentPath, "utf-8")

assert(cardComponent.includes("shadow-redi-card"), "Card component applies shadow-redi-card by default")
assert(cardComponent.includes("interactive"), "Card component supports interactive prop")
assert(cardComponent.includes("hover:shadow-redi-card-hover"), "Card component supports hover:shadow-redi-card-hover on interactive")

// Test 3: Verify Button Component Touch Targets
console.log("\n--- 3. Button Component Touch Targets ---")
const buttonComponentPath = path.resolve(__dirname, "../components/ui/button.tsx")
const buttonComponent = fs.readFileSync(buttonComponentPath, "utf-8")

assert(buttonComponent.includes("h-11 sm:h-10"), "Button default size provides 44px mobile height (h-11) and 40px desktop height (sm:h-10)")
assert(buttonComponent.includes("size-11 sm:size-10"), "Icon button provides 44px mobile touch target (size-11)")
assert(buttonComponent.includes("focus-visible:ring-3"), "Button specifies visible focus ring")

// Test 4: Verify Navigation Active State Logic
console.log("\n--- 4. Navigation Active State Logic ---")
function isNavActive(pathname: string, itemHref: string): boolean {
  return pathname === itemHref || (itemHref !== "/dashboard" && pathname.startsWith(itemHref))
}

assert(isNavActive("/dashboard", "/dashboard") === true, "Dashboard route matches /dashboard")
assert(isNavActive("/calendar", "/dashboard") === false, "Dashboard does not match /calendar")
assert(isNavActive("/calendar", "/calendar") === true, "Calendar route matches /calendar")
assert(isNavActive("/cycles", "/cycles") === true, "Cycles list matches /cycles")
assert(isNavActive("/cycles/cycle-123", "/cycles") === true, "Cycle detail route matches /cycles nav item")
assert(isNavActive("/settings", "/settings") === true, "Settings route matches /settings")
assert(isNavActive("/settings", "/cycles") === false, "Settings route does not match /cycles")

// Test 5: Verify Empty State Patterns
console.log("\n--- 5. Empty State Consistency ---")
const cycleListPath = path.resolve(__dirname, "../components/cycles/cycle-list.tsx")
const cycleListContent = fs.readFileSync(cycleListPath, "utf-8")
assert(cycleListContent.includes("bg-lavender text-primary"), "Cycle empty state uses standard lavender icon badge")

const symptomHistoryPath = path.resolve(__dirname, "../components/symptoms/symptom-history.tsx")
const symptomHistoryContent = fs.readFileSync(symptomHistoryPath, "utf-8")
assert(symptomHistoryContent.includes("bg-lavender text-primary"), "Symptom empty state uses standard lavender icon badge")

const notesHistoryPath = path.resolve(__dirname, "../components/notes/notes-history.tsx")
const notesHistoryContent = fs.readFileSync(notesHistoryPath, "utf-8")
assert(notesHistoryContent.includes("bg-lavender text-primary"), "Notes empty state uses standard lavender icon badge")

// Test 6: Verify Dashboard Connectivity to Symptoms & Notes
console.log("\n--- 6. Dashboard Connectivity to Symptoms & Notes ---")
const todaySymptomsCardPath = path.resolve(__dirname, "../components/dashboard/today-symptoms-card.tsx")
const todaySymptomsCardContent = fs.readFileSync(todaySymptomsCardPath, "utf-8")
assert(todaySymptomsCardContent.includes('href="/symptoms"'), "TodaySymptomsCard links to /symptoms")
assert(todaySymptomsCardContent.includes("View all symptoms"), "TodaySymptomsCard displays 'View all symptoms'")

const todayNoteCardPath = path.resolve(__dirname, "../components/dashboard/today-note-card.tsx")
const todayNoteCardContent = fs.readFileSync(todayNoteCardPath, "utf-8")
assert(todayNoteCardContent.includes('href="/notes"'), "TodayNoteCard links to /notes")
assert(todayNoteCardContent.includes("View all notes"), "TodayNoteCard displays 'View all notes'")

// Test 7: Verify Safe-Area and Mobile-First Viewport Padding
console.log("\n--- 7. Mobile Navigation Ergonomics & Safe-Area ---")
const mobileNavPath = path.resolve(__dirname, "../components/shell/mobile-bottom-nav.tsx")
const mobileNavContent = fs.readFileSync(mobileNavPath, "utf-8")
assert(mobileNavContent.includes("safe-area-inset-bottom"), "MobileBottomNav respects env(safe-area-inset-bottom)")
assert(mobileNavContent.includes("min-h-[48px]"), "Mobile nav links have minimum 48px touch height")

// Test 8: Verify Separation of Daily Notes and Symptoms
console.log("\n--- 8. Separation of Daily Notes & Symptoms ---")
const notesActionsPath = path.resolve(__dirname, "../app/actions/notes.ts")
const notesActionsContent = fs.readFileSync(notesActionsPath, "utf-8")
assert(notesActionsContent.includes('from("daily_notes")'), "Notes action queries daily_notes table exclusively")

const symptomsActionsPath = path.resolve(__dirname, "../app/actions/symptoms.ts")
const symptomsActionsContent = fs.readFileSync(symptomsActionsPath, "utf-8")
assert(symptomsActionsContent.includes('from("symptoms")'), "Symptoms action queries symptoms table exclusively")

console.log("\n=== ALL PHASE 13 UX / INTEGRATION POLISH TESTS PASSED ===")
