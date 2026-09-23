/**
 * Seijun Phase 18.5 Settings Architecture & User Preferences Refactor Test Suite
 *
 * Verifies:
 * 1. Existence and integrity of reusable Settings architecture components
 * 2. Proper hierarchy of categorized sectioned list navigation
 * 3. Verification of all 7 category sections:
 *    - ACCOUNT (Profile, Avatar, Account & Login)
 *    - CYCLE & TRACKING (Cycle Preferences, Tracking Preferences, Cycle History)
 *    - PARTNER (Partner Connection, Sharing Preferences, Partner Permissions)
 *    - NOTIFICATIONS (Push Notifications, Cycle Reminders, Partner Notifications)
 *    - APPEARANCE (Theme, Display Preferences)
 *    - PRIVACY & SECURITY (Privacy, Security & Sessions, Danger Zone)
 *    - SUPPORT & ABOUT (Help/FAQs, About Seijun, Privacy Policy, Terms)
 * 4. Dedicated subpages existence:
 *    - /settings/profile
 *    - /settings/cycle
 *    - /settings/notifications
 *    - /settings/appearance
 *    - /settings/privacy
 *    - /settings/about
 * 5. Standalone destructive logout placement
 * 6. Zero regression of existing settings actions or components
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Phase 18.5 Settings Architecture Test Suite ===\n")

let failures = 0

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`)
    failures++
  } else {
    console.log(`  ✓ ${message}`)
  }
}

// 1. Reusable Component Files
console.log("[Test 1] Verifying Reusable Settings Architecture Components...")
const componentFiles = [
  "components/settings/settings-types.ts",
  "components/settings/settings-section.tsx",
  "components/settings/settings-item.tsx",
  "components/settings/settings-toggle.tsx",
  "components/settings/settings-divider.tsx",
  "components/settings/settings-page-header.tsx",
  "components/settings/settings-menu.tsx",
  "components/settings/profile-settings-form.tsx",
  "components/settings/cycle-settings-form.tsx",
  "components/settings/appearance-settings-view.tsx",
  "components/settings/privacy-settings-view.tsx",
  "components/settings/about-settings-view.tsx",
]

for (const relPath of componentFiles) {
  const fullPath = path.join(rootDir, relPath)
  assert(fs.existsSync(fullPath), `${relPath} exists`)
}

// 2. Settings Subroutes
console.log("\n[Test 2] Verifying Dedicated Settings Routes...")
const routeFiles = [
  "app/settings/page.tsx",
  "app/settings/profile/page.tsx",
  "app/settings/cycle/page.tsx",
  "app/settings/notifications/page.tsx",
  "app/settings/appearance/page.tsx",
  "app/settings/privacy/page.tsx",
  "app/settings/about/page.tsx",
]

for (const relPath of routeFiles) {
  const fullPath = path.join(rootDir, relPath)
  assert(fs.existsSync(fullPath), `${relPath} exists`)
}

// 3. Inspect Category Structure in settings-menu.tsx
console.log("\n[Test 3] Auditing Categorized Structure in SettingsMenu...")
const menuContent = fs.readFileSync(path.join(rootDir, "components/settings/settings-menu.tsx"), "utf-8")

const requiredCategories = [
  "Account",
  "Cycle & Tracking",
  "Partner",
  "Notifications",
  "Appearance",
  "Privacy & Security",
  "Support & About",
]

for (const category of requiredCategories) {
  assert(
    menuContent.includes(`title="${category}"`) || menuContent.includes(`title: "${category}"`),
    `Category header '${category}' present`
  )
}

// 4. Verify Essential Navigation Links in SettingsMenu
console.log("\n[Test 4] Verifying Settings Item Navigation Endpoints...")
const requiredEndpoints = [
  "/settings/profile",
  "/settings/cycle",
  "/cycles",
  "/settings/notifications",
  "/settings/appearance",
  "/settings/privacy",
  "/settings/about",
]

for (const endpoint of requiredEndpoints) {
  assert(menuContent.includes(`"${endpoint}"`), `Navigation link to '${endpoint}' present`)
}

// 5. Destructive Logout Separation
console.log("\n[Test 5] Verifying Logout is Separate Destructive Item at Bottom...")
assert(menuContent.includes("<LogoutButton />"), "LogoutButton embedded in SettingsMenu")
assert(
  menuContent.indexOf("<LogoutButton />") > menuContent.indexOf('title="Support & About"'),
  "LogoutButton positioned at the bottom after all categories"
)

// 6. Preservation of Existing Components
console.log("\n[Test 6] Verifying Existing Components Preservation...")
const existingComponents = [
  "components/settings/settings-form.tsx",
  "components/settings/notification-preferences.tsx",
  "components/settings/push-test-card.tsx",
  "components/settings/theme-selector.tsx",
  "components/settings/settings-skeleton.tsx",
]

for (const relPath of existingComponents) {
  const fullPath = path.join(rootDir, relPath)
  assert(fs.existsSync(fullPath), `Existing component ${relPath} preserved`)
}

// 7. Accessibility Checks
console.log("\n[Test 7] Verifying WAI-ARIA and Accessibility Patterns...")
const toggleContent = fs.readFileSync(path.join(rootDir, "components/settings/settings-toggle.tsx"), "utf-8")
assert(toggleContent.includes('role="switch"'), "SettingsToggle implements role='switch'")
assert(toggleContent.includes('aria-checked='), "SettingsToggle implements dynamic aria-checked")

const itemContent = fs.readFileSync(path.join(rootDir, "components/settings/settings-item.tsx"), "utf-8")
assert(itemContent.includes("focus-visible:ring-2"), "SettingsItem includes focus-visible states")

console.log("\n=================================================")
if (failures === 0) {
  console.log("ALL PHASE 18.5 SETTINGS ARCHITECTURE CHECKS PASSED! 🎉")
  process.exit(0)
} else {
  console.error(`FAILED: ${failures} check(s) failed.`)
  process.exit(1)
}
