import fs from "node:fs"
import path from "node:path"

/**
 * Calculates the next version according to strict Semantic Versioning:
 *
 * MAJOR: Breaking changes, architectural transitions
 *        1.19.0 -> 2.0.0
 *
 * MINOR: New features, backward-compatible functionality, meaningful improvements
 *        1.18.4 -> 1.19.0
 *        1.19.0 -> 1.20.0
 *
 * PATCH: Bug fixes, small corrections, non-breaking maintenance
 *        1.18.4 -> 1.18.5
 *        1.19.0 -> 1.19.1
 *
 * Rules:
 * - Git commits do NOT increment SemVer.
 * - Deployments do NOT increment SemVer.
 * - Builds do NOT increment SemVer.
 * - PWA cache updates do NOT increment SemVer.
 *
 * @param {string} currentVersion
 * @param {"patch" | "minor" | "major"} [releaseType="patch"]
 * @returns {string}
 */
export function getNextSemver(currentVersion, releaseType = "patch") {
  if (typeof currentVersion !== "string") {
    throw new TypeError(`Expected version to be a string, got ${typeof currentVersion}`)
  }

  const trimmed = currentVersion.trim().replace(/^v/, "")
  const match = trimmed.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) {
    throw new Error(`Invalid version format: "${currentVersion}". Must be major.minor.patch (e.g. 1.18.4)`)
  }

  const major = parseInt(match[1], 10)
  const minor = parseInt(match[2], 10)
  const patch = parseInt(match[3], 10)

  const normalizedType = releaseType.toLowerCase()

  switch (normalizedType) {
    case "patch":
      return `${major}.${minor}.${patch + 1}`
    case "minor":
      return `${major}.${minor + 1}.0`
    case "major":
      return `${major + 1}.0.0`
    default:
      throw new Error(`Invalid release type: "${releaseType}". Must be "patch", "minor", or "major".`)
  }
}

/**
 * Backwards compatibility helper defaulting to patch increment.
 *
 * @param {string} currentVersion
 * @returns {string}
 */
export function getNextVersion(currentVersion) {
  return getNextSemver(currentVersion, "patch")
}

/**
 * Updates version in package.json and synchronizes package-lock.json.
 * Preserves exact 2-space indentation and trailing newline.
 *
 * @param {string} newVersion
 * @param {string} [projectRoot=process.cwd()]
 * @returns {{ previousVersion: string, newVersion: string, packageJsonPath: string, packageLockPath: string }}
 */
export function updatePackageVersions(newVersion, projectRoot = process.cwd()) {
  const packageJsonPath = path.join(projectRoot, "package.json")
  const packageLockPath = path.join(projectRoot, "package-lock.json")

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at: ${packageJsonPath}`)
  }

  const packageJsonRaw = fs.readFileSync(packageJsonPath, "utf8")
  const packageJson = JSON.parse(packageJsonRaw)
  const previousVersion = packageJson.version

  packageJson.version = newVersion
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf8")

  // Synchronize package-lock.json if it exists
  if (fs.existsSync(packageLockPath)) {
    const packageLockRaw = fs.readFileSync(packageLockPath, "utf8")
    const packageLock = JSON.parse(packageLockRaw)

    packageLock.version = newVersion
    if (packageLock.packages && packageLock.packages[""]) {
      packageLock.packages[""].version = newVersion
    }

    fs.writeFileSync(packageLockPath, JSON.stringify(packageLock, null, 2) + "\n", "utf8")
  }

  return {
    previousVersion,
    newVersion,
    packageJsonPath,
    packageLockPath,
  }
}

/**
 * Intentional version bump utility.
 *
 * @param {"patch" | "minor" | "major"} [releaseType="patch"]
 * @param {string} [projectRoot=process.cwd()]
 * @returns {{ previousVersion: string, newVersion: string, releaseType: string }}
 */
export function bumpVersion(releaseType = "patch", projectRoot = process.cwd()) {
  const packageJsonPath = path.join(projectRoot, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at: ${packageJsonPath}`)
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
  const currentVersion = pkg.version || "1.18.4"
  const nextVersion = getNextSemver(currentVersion, releaseType)

  const result = updatePackageVersions(nextVersion, projectRoot)

  return {
    previousVersion: result.previousVersion,
    newVersion: result.newVersion,
    releaseType,
  }
}
