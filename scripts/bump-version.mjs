import fs from "node:fs"
import path from "node:path"
import { getNextVersion, updatePackageVersions } from "./version-lib.mjs"

const projectRoot = process.cwd()
const packageJsonPath = path.join(projectRoot, "package.json")

if (!fs.existsSync(packageJsonPath)) {
  console.error("Error: package.json not found in current directory.")
  process.exit(1)
}

try {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
  const currentVersion = pkg.version || "0.1.0"
  const nextVersion = getNextVersion(currentVersion)

  const result = updatePackageVersions(nextVersion, projectRoot)
  console.log(`[seijun-version] Version incremented: v${result.previousVersion} -> v${result.newVersion}`)
  console.log(`[seijun-version] Synchronized package.json and package-lock.json`)
} catch (error) {
  console.error(`[seijun-version] Failed to bump version:`, error.message)
  process.exit(1)
}
