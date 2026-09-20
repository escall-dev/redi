import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import { getNextVersion, shouldBumpVersion, updatePackageVersions } from "./version-lib.mjs"

// Escape hatch: Allow explicit skip if needed
if (process.env.SEIJUN_SKIP_VERSION_BUMP === "1" || process.env.SEIJUN_SKIP_VERSION_BUMP === "true") {
  console.log("[seijun-version] Version bump skipped (SEIJUN_SKIP_VERSION_BUMP is active)")
  process.exit(0)
}

// Anti-recursion guard: Strictly prevent nested/looping execution
if (process.env.SEIJUN_VERSION_BUMPING === "1") {
  process.exit(0)
}
process.env.SEIJUN_VERSION_BUMPING = "1"

const projectRoot = process.cwd()
const packageJsonPath = path.join(projectRoot, "package.json")

if (!fs.existsSync(packageJsonPath)) {
  process.exit(0)
}

try {
  // 1. Inspect files staged for the current commit
  const stagedOutput = execSync("git diff --cached --name-only", {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"]
  })
  const stagedFiles = stagedOutput.split(/\r?\n/).map((f) => f.trim()).filter(Boolean)

  if (stagedFiles.length === 0) {
    // Nothing staged
    process.exit(0)
  }

  // 2. Check if staged files contain application code/configuration changes
  if (!shouldBumpVersion(stagedFiles)) {
    console.log("[seijun-version] No application code changes staged (docs/scratch/logs only). Version unchanged.")
    process.exit(0)
  }

  // 3. Determine the baseline version from the last committed state (HEAD:package.json)
  // This prevents double-bumping if a previous commit attempt was aborted or staged repeatedly
  let baseVersion
  try {
    const headPkgRaw = execSync("git show HEAD:package.json", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"]
    })
    const headPkg = JSON.parse(headPkgRaw)
    baseVersion = headPkg.version
  } catch {
    const diskPkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
    baseVersion = diskPkg.version || "0.1.0"
  }

  const nextVersion = getNextVersion(baseVersion)

  // 4. Update package.json and synchronize package-lock.json
  const result = updatePackageVersions(nextVersion, projectRoot)

  // 5. Stage package.json and package-lock.json into the CURRENT ongoing commit
  // Notice: We do NOT invoke `git commit` here, which guarantees zero infinite commit loops!
  execSync("git add package.json package-lock.json", { stdio: "inherit" })

  console.log(
    `[seijun-version] Application version automatically advanced: v${result.previousVersion} -> v${result.newVersion}`
  )
} catch (error) {
  console.error("[seijun-version] Error during automatic version bump:", error.message)
  // Don't block the developer's commit if an unexpected Git inspection error occurs,
  // but report the warning clearly
  process.exit(0)
}
