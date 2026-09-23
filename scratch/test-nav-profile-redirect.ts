import fs from "fs"
import path from "path"
import assert from "assert"

const rootDir = process.cwd()

console.log("=== Testing Navigation Bar Profile Redirection ===")

// 1. Desktop Header
const desktopHeaderFile = path.join(rootDir, "components", "shell", "desktop-header.tsx")
const desktopContent = fs.readFileSync(desktopHeaderFile, "utf-8")

assert(
  desktopContent.includes('href="/settings/profile"'),
  "DesktopHeader: Profile Avatar link must point to /settings/profile"
)
assert(
  !desktopContent.includes('href="/settings"\n            aria-label="Profile Settings"'),
  "DesktopHeader: Old /settings link with Profile Settings label should not exist"
)
assert(
  desktopContent.includes('aria-label="User Profile Details"'),
  "DesktopHeader: Avatar link must have aria-label='User Profile Details'"
)
assert(
  desktopContent.includes('pathname === "/settings/profile"'),
  "DesktopHeader: Must check pathname === '/settings/profile' for active state"
)
assert(
  desktopContent.includes("ring-2 ring-primary/40"),
  "DesktopHeader: Must apply active ring highlight when on /settings/profile"
)
console.log("  ✓ DesktopHeader profile link to /settings/profile verified with active indicator")

// 2. Mobile Header
const mobileHeaderFile = path.join(rootDir, "components", "shell", "mobile-header.tsx")
const mobileContent = fs.readFileSync(mobileHeaderFile, "utf-8")

assert(
  mobileContent.includes("usePathname"),
  "MobileHeader: Must import usePathname from next/navigation"
)
assert(
  mobileContent.includes('href="/settings/profile"'),
  "MobileHeader: Profile Avatar link must point to /settings/profile"
)
assert(
  !mobileContent.includes('href="/settings"\n          aria-label="Profile Settings"'),
  "MobileHeader: Old /settings link with Profile Settings label should not exist"
)
assert(
  mobileContent.includes('aria-label="User Profile Details"'),
  "MobileHeader: Avatar link must have aria-label='User Profile Details'"
)
assert(
  mobileContent.includes('pathname === "/settings/profile"'),
  "MobileHeader: Must check pathname === '/settings/profile' for active state"
)
assert(
  mobileContent.includes("ring-2 ring-primary/40"),
  "MobileHeader: Must apply active ring highlight when on /settings/profile"
)
console.log("  ✓ MobileHeader profile link to /settings/profile verified with active indicator")

// 3. Settings Menu Top Banner
const settingsMenuFile = path.join(rootDir, "components", "settings", "settings-menu.tsx")
const settingsMenuContent = fs.readFileSync(settingsMenuFile, "utf-8")

assert(
  settingsMenuContent.includes('onClick={() => navigateToView("profile")}'),
  "SettingsMenu: Top profile banner must be interactive and navigate to profile subview"
)
assert(
  settingsMenuContent.includes('aria-label="Manage Profile & Avatar Details"'),
  "SettingsMenu: Top profile banner must have descriptive aria-label"
)
assert(
  settingsMenuContent.includes("View profile"),
  "SettingsMenu: Top profile banner should feature visual 'View profile' hint and chevron"
)
console.log("  ✓ SettingsMenu top profile banner verified as interactive navigation element")

console.log("\n=================================================")
console.log("ALL PROFILE REDIRECTION CHECKS PASSED! 🎉")
console.log("=================================================")
