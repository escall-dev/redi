import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { getNextSemver, getNextVersion, updatePackageVersions, bumpVersion } from "./version-lib.mjs"

console.log("=== Running Seijun Semantic Versioning Test Suite ===")

// -------------------------------------------------------------
// Test Group 1: Strict Semantic Versioning Progression Rules
// -------------------------------------------------------------
console.log("\n[Test 1] Testing Semantic Versioning progression (PATCH, MINOR, MAJOR)...")

// 1.1 PATCH progression
assert.equal(getNextSemver("1.18.4", "patch"), "1.18.5", "PATCH from 1.18.4 must be 1.18.5")
assert.equal(getNextSemver("1.19.0", "patch"), "1.19.1", "PATCH from 1.19.0 must be 1.19.1")
assert.equal(getNextVersion("1.18.4"), "1.18.5", "Default getNextVersion alias must bump patch")
console.log("  ✓ PATCH progression verified (1.18.4 -> 1.18.5, 1.19.0 -> 1.19.1)")

// 1.2 MINOR progression
assert.equal(getNextSemver("1.18.4", "minor"), "1.19.0", "MINOR from 1.18.4 must be 1.19.0")
assert.equal(getNextSemver("1.19.0", "minor"), "1.20.0", "MINOR from 1.19.0 must be 1.20.0")
console.log("  ✓ MINOR progression verified (1.18.4 -> 1.19.0, 1.19.0 -> 1.20.0)")

// 1.3 MAJOR progression
assert.equal(getNextSemver("1.19.0", "major"), "2.0.0", "MAJOR from 1.19.0 must be 2.0.0")
assert.equal(getNextSemver("1.18.4", "major"), "2.0.0", "MAJOR from 1.18.4 must be 2.0.0")
console.log("  ✓ MAJOR progression verified (1.19.0 -> 2.0.0)")

// -------------------------------------------------------------
// Test Group 2: SemVer Safety Guards & Non-Semantic Rejections
// -------------------------------------------------------------
console.log("\n[Test 2] Testing safety guards and format enforcement...")

// Invalid release types must throw
assert.throws(() => getNextSemver("1.18.4", "commit"), /Invalid release type/, "Commits cannot be a release type")
assert.throws(() => getNextSemver("1.18.4", "deployment"), /Invalid release type/, "Deployments cannot be a release type")
assert.throws(() => getNextSemver("1.18.4", "build"), /Invalid release type/, "Builds cannot be a release type")

// Invalid version formats must throw
assert.throws(() => getNextSemver("invalid"), /Invalid version format/)
assert.throws(() => getNextSemver("1.0"), /Invalid version format/)
assert.throws(() => getNextSemver(123), /Expected version to be a string/)
console.log("  ✓ Non-semantic and malformed version formats strictly rejected")

// -------------------------------------------------------------
// Test Group 3: Package Metadata Synchronization (package.json & lock)
// -------------------------------------------------------------
console.log("\n[Test 3] Testing package.json & package-lock.json atomic synchronization...")

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seijun-ver-test-"))
try {
  const mockPackageJson = {
    name: "seijun",
    version: "1.18.4",
    private: true
  }
  const mockPackageLockJson = {
    name: "seijun",
    version: "1.18.4",
    lockfileVersion: 3,
    packages: {
      "": {
        name: "seijun",
        version: "1.18.4"
      }
    }
  }

  fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(mockPackageJson, null, 2) + "\n")
  fs.writeFileSync(path.join(tempDir, "package-lock.json"), JSON.stringify(mockPackageLockJson, null, 2) + "\n")

  const syncResult = updatePackageVersions("1.18.5", tempDir)
  assert.equal(syncResult.previousVersion, "1.18.4")
  assert.equal(syncResult.newVersion, "1.18.5")

  const updatedPkg = JSON.parse(fs.readFileSync(path.join(tempDir, "package.json"), "utf8"))
  const updatedLock = JSON.parse(fs.readFileSync(path.join(tempDir, "package-lock.json"), "utf8"))

  assert.equal(updatedPkg.version, "1.18.5", "package.json version must be 1.18.5")
  assert.equal(updatedLock.version, "1.18.5", "package-lock.json root version must be 1.18.5")
  assert.equal(updatedLock.packages[""].version, "1.18.5", "package-lock.json packages[''] version must be 1.18.5")
  console.log("  ✓ package.json and package-lock.json synchronized atomically")
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}

// -------------------------------------------------------------
// Test Group 4: Active Single Source of Truth
// -------------------------------------------------------------
console.log("\n[Test 4] Verifying canonical single source of truth across project...")

const rootPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"))
const rootLock = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package-lock.json"), "utf8"))

assert.equal(rootPkg.version, rootLock.version, "Root package.json and package-lock.json versions must match")
assert.equal(rootPkg.version, rootLock.packages[""].version, "Root package.json and packages[''] version must match")
console.log(`  ✓ Canonical version in package metadata: v${rootPkg.version}`)

// -------------------------------------------------------------
// Test Group 5: UI Components Single Source of Truth
// -------------------------------------------------------------
console.log("\n[Test 5] Verifying all UI components import from canonical lib/version.ts...")

const aboutViewPath = path.join(process.cwd(), "components", "settings", "about-settings-view.tsx")
const settingsMenuPath = path.join(process.cwd(), "components", "settings", "settings-menu.tsx")
const loginPagePath = path.join(process.cwd(), "app", "login", "page.tsx")

const aboutContent = fs.readFileSync(aboutViewPath, "utf8")
const settingsContent = fs.readFileSync(settingsMenuPath, "utf8")
const loginContent = fs.readFileSync(loginPagePath, "utf8")

// Verify imports
assert.ok(aboutContent.includes(`@/lib/version`), "AboutSettingsView must import from @/lib/version")
assert.ok(settingsContent.includes(`@/lib/version`), "SettingsMenu must import from @/lib/version")
assert.ok(loginContent.includes(`@/lib/version`), "LoginPage must import from @/lib/version")

// Verify NO hardcoded stale versions in UI
assert.ok(!aboutContent.includes("v2.0.6"), "AboutSettingsView must not contain hardcoded v2.0.6")
assert.ok(!settingsContent.includes("v2.0.6"), "SettingsMenu must not contain hardcoded v2.0.6")
assert.ok(!aboutContent.includes("v2.0.33"), "AboutSettingsView must not contain stale v2.0.33")
assert.ok(!settingsContent.includes("v2.0.33"), "SettingsMenu must not contain stale v2.0.33")
console.log("  ✓ All UI version displays read from canonical lib/version.ts with zero stale hardcodes")

// -------------------------------------------------------------
// Test Group 6: Git Commit Invariance (No Auto-Bumping)
// -------------------------------------------------------------
console.log("\n[Test 6] Verifying Git commits do NOT increment application SemVer...")

const preCommitHook = fs.readFileSync(path.join(process.cwd(), ".githooks", "pre-commit"), "utf8")
assert.ok(!preCommitHook.includes("node scripts/pre-commit-hook.mjs"), "Pre-commit hook must not call version bumping")
assert.ok(preCommitHook.includes("exit 0"), "Pre-commit hook must safely exit 0 without bumping")

const preCommitScript = fs.readFileSync(path.join(process.cwd(), "scripts", "pre-commit-hook.mjs"), "utf8")
assert.ok(!preCommitScript.includes("updatePackageVersions"), "pre-commit-hook.mjs must not modify package versions")
console.log("  ✓ Git commits verified to NOT increment application version")

console.log("\n=================================================")
console.log("ALL SEIJUN VERSIONING TESTS PASSED SUCCESSFULLY! (6/6)")
console.log("=================================================\n")
