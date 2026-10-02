import path from "node:path"
import { bumpVersion } from "./version-lib.mjs"

const projectRoot = process.cwd()
const rawArg = process.argv[2] || "patch"
const releaseType = rawArg.toLowerCase().replace(/^--/, "")

if (!["patch", "minor", "major"].includes(releaseType)) {
  console.error(`[seijun-version] Error: Invalid release type "${rawArg}".`)
  console.error(`Usage: node scripts/bump-version.mjs [patch|minor|major]`)
  process.exit(1)
}

try {
  const result = bumpVersion(releaseType, projectRoot)
  console.log(
    `[seijun-version] Intentional Semantic Version Release (${result.releaseType.toUpperCase()}): ` +
    `v${result.previousVersion} -> v${result.newVersion}`
  )
  console.log(`[seijun-version] Synchronized package.json and package-lock.json`)
} catch (error) {
  console.error(`[seijun-version] Failed to release version:`, error.message)
  process.exit(1)
}
