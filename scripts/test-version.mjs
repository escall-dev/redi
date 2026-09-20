import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { getNextVersion, isAppFile, shouldBumpVersion, updatePackageVersions } from "./version-lib.mjs"

console.log("=== Running Seijun Versioning Test Suite ===")

// -------------------------------------------------------------
// Test Group 1: Progression Rules
// -------------------------------------------------------------
console.log("\n[Test 1] Testing exact version progression sequence...")

const expectedSequence = [
  ["0.1.0", "0.1.1"],
  ["0.1.1", "0.1.2"],
  ["0.1.2", "0.1.3"],
  ["0.1.3", "0.1.4"],
  ["0.1.4", "0.1.5"],
  ["0.1.5", "0.1.6"],
  ["0.1.6", "0.1.7"],
  ["0.1.7", "0.1.8"],
  ["0.1.8", "0.1.9"],
  ["0.1.9", "2.0.0"],
  ["2.0.0", "2.0.1"]
]

for (const [input, expected] of expectedSequence) {
  const result = getNextVersion(input)
  assert.equal(
    result,
    expected,
    `Progression failed for ${input}: expected ${expected}, got ${result}`
  )
  console.log(`  ✓ ${input} -> ${result}`)
}

// -------------------------------------------------------------
// Test Group 2: Critical Negative Guard Assertions for 0.1.9
// -------------------------------------------------------------
console.log("\n[Test 2] Testing critical 0.1.9 safety guards...")

const bump019 = getNextVersion("0.1.9")
assert.equal(bump019, "2.0.0", "0.1.9 must strictly transition to 2.0.0")
assert.notEqual(bump019, "0.1.10", "CRITICAL ERROR: 0.1.9 must NEVER become 0.1.10")
assert.notEqual(bump019, "0.2.0", "CRITICAL ERROR: 0.1.9 must NEVER become 0.2.0")
console.log("  ✓ 0.1.9 -> 2.0.0 verified")
console.log("  ✓ Confirmed 0.1.9 !== 0.1.10")
console.log("  ✓ Confirmed 0.1.9 !== 0.2.0")

// -------------------------------------------------------------
// Test Group 3: App File Filtering Rules
// -------------------------------------------------------------
console.log("\n[Test 3] Testing file trigger classification...")

const appFiles = [
  "app/login/page.tsx",
  "app/dashboard/page.tsx",
  "components/auth/login-form.tsx",
  "components/brand/redi-logo.tsx",
  "lib/auth/session.ts",
  "lib/version.ts",
  "public/icon.svg",
  "public/manifest.webmanifest",
  "supabase/migrations/01_auth.sql",
  "scripts/generate-pwa-icons.mjs",
  "next.config.ts",
  "tsconfig.json",
  "package.json"
]

for (const file of appFiles) {
  assert.equal(isAppFile(file), true, `Expected "${file}" to be classified as application file`)
  console.log(`  ✓ App file recognized: ${file}`)
}

const ignoredFiles = [
  "README.md",
  "CLAUDE.md",
  "AGENTS.md",
  "docs/architecture.md",
  "scratch/notes.txt",
  "scratch/temp.json",
  "server.log",
  ".gitignore",
  ".gitattributes",
  ".githooks/pre-commit",
  "tsconfig.tsbuildinfo",
  ".next/build-manifest.json",
  "package-lock.json"
]

for (const file of ignoredFiles) {
  assert.equal(isAppFile(file), false, `Expected "${file}" to be ignored`)
  console.log(`  ✓ Ignored file recognized: ${file}`)
}

assert.equal(shouldBumpVersion(ignoredFiles), false, "Staging only ignored files should NOT trigger bump")
assert.equal(shouldBumpVersion([...ignoredFiles, "app/login/page.tsx"]), true, "Staging code file must trigger bump")
console.log("  ✓ shouldBumpVersion correctly filters staged changesets")

// -------------------------------------------------------------
// Test Group 4: Package Metadata Synchronization
// -------------------------------------------------------------
console.log("\n[Test 4] Testing package.json & package-lock.json atomic synchronization...")

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seijun-ver-test-"))
try {
  const mockPackageJson = {
    name: "seijun",
    version: "0.1.0",
    private: true
  }
  const mockPackageLockJson = {
    name: "seijun",
    version: "0.1.0",
    lockfileVersion: 3,
    packages: {
      "": {
        name: "seijun",
        version: "0.1.0"
      }
    }
  }

  fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(mockPackageJson, null, 2) + "\n")
  fs.writeFileSync(path.join(tempDir, "package-lock.json"), JSON.stringify(mockPackageLockJson, null, 2) + "\n")

  const syncResult = updatePackageVersions("0.1.1", tempDir)
  assert.equal(syncResult.previousVersion, "0.1.0")
  assert.equal(syncResult.newVersion, "0.1.1")

  const updatedPkg = JSON.parse(fs.readFileSync(path.join(tempDir, "package.json"), "utf8"))
  const updatedLock = JSON.parse(fs.readFileSync(path.join(tempDir, "package-lock.json"), "utf8"))

  assert.equal(updatedPkg.version, "0.1.1", "package.json version must be 0.1.1")
  assert.equal(updatedLock.version, "0.1.1", "package-lock.json root version must be 0.1.1")
  assert.equal(updatedLock.packages[""].version, "0.1.1", "package-lock.json packages[''] version must be 0.1.1")
  console.log("  ✓ package.json and package-lock.json synchronized atomically to 0.1.1")

  // Transition to 2.0.0
  updatePackageVersions("2.0.0", tempDir)
  const pkg2 = JSON.parse(fs.readFileSync(path.join(tempDir, "package.json"), "utf8"))
  const lock2 = JSON.parse(fs.readFileSync(path.join(tempDir, "package-lock.json"), "utf8"))
  assert.equal(pkg2.version, "2.0.0")
  assert.equal(lock2.version, "2.0.0")
  assert.equal(lock2.packages[""].version, "2.0.0")
  console.log("  ✓ package.json and package-lock.json synchronized atomically to 2.0.0")
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}

// -------------------------------------------------------------
// Test Group 5: Active Single Source of Truth
// -------------------------------------------------------------
console.log("\n[Test 5] Verifying single source of truth in project...")

const rootPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"))
const rootLock = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package-lock.json"), "utf8"))

assert.equal(rootPkg.version, rootLock.version, "Root package.json and package-lock.json versions must match")
assert.equal(rootPkg.version, rootLock.packages[""].version, "Root package.json and package-lock.json packages[''] must match")
console.log(`  ✓ Root package metadata synchronized at v${rootPkg.version}`)

console.log("\n=================================================")
console.log("ALL SEIJUN VERSIONING TESTS PASSED SUCCESSFULLY! (5/5)")
console.log("=================================================\n")
