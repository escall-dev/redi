import fs from "node:fs"
import path from "node:path"

/**
 * Calculates the next version according to Seijun's exact progression specification:
 * 0.1.0 -> 0.1.1
 * 0.1.1 -> 0.1.2
 * ...
 * 0.1.8 -> 0.1.9
 * 0.1.9 -> 2.0.0  (Strictly NOT 0.1.10 and NOT 0.2.0)
 *
 * For post-2.0.0 releases, standard semantic patch progression continues (2.0.0 -> 2.0.1 ...).
 *
 * @param {string} currentVersion
 * @returns {string}
 */
export function getNextVersion(currentVersion) {
  if (typeof currentVersion !== "string") {
    throw new TypeError(`Expected version to be a string, got ${typeof currentVersion}`)
  }

  const trimmed = currentVersion.trim().replace(/^v/, "")
  const match = trimmed.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) {
    throw new Error(`Invalid version format: "${currentVersion}". Must be major.minor.patch (e.g. 0.1.0)`)
  }

  const major = parseInt(match[1], 10)
  const minor = parseInt(match[2], 10)
  const patch = parseInt(match[3], 10)

  // EXACT SPECIFICATION: 0.1.9 -> 2.0.0 (Do NOT use 0.1.10, Do NOT use 0.2.0)
  if (major === 0 && minor === 1 && patch === 9) {
    return "2.0.0"
  }

  // 0.1.0 -> 0.1.1 -> ... -> 0.1.8 -> 0.1.9
  if (major === 0 && minor === 1) {
    return `0.1.${patch + 1}`
  }

  // General progression for 2.0.0+
  return `${major}.${minor}.${patch + 1}`
}

/**
 * Determines whether a file path qualifies as an application source or configuration change.
 * 
 * Included:
 * - App routes and pages (app/**)
 * - Components (components/**)
 * - Library and auth logic (lib/**)
 * - Public static assets and icons (public/**)
 * - Database and migration files (supabase/**)
 * - Scripts impacting app/build (scripts/**)
 * - Configuration files (next.config.*, tsconfig.json, components.json, postcss.config.*, eslint.config.*, proxy.ts)
 * - Code file extensions (.ts, .tsx, .js, .mjs, .cjs, .css, .sql)
 * 
 * Excluded:
 * - Markdown / documentation (*.md)
 * - Scratch files (scratch/**)
 * - Log files (*.log)
 * - Git internals and hooks (.gitignore, .gitattributes, .githooks/**, .git/**)
 * - Build caches and temp files (*.tsbuildinfo, .next/**, .agents/**)
 *
 * @param {string} filePath
 * @returns {boolean}
 */
export function isAppFile(filePath) {
  if (!filePath) return false

  // Normalize path separators to forward slashes
  const normalized = filePath.trim().replace(/\\/g, "/")

  // Ignored patterns
  if (
    normalized.endsWith(".md") ||
    normalized.startsWith("scratch/") ||
    normalized.endsWith(".log") ||
    normalized === ".gitignore" ||
    normalized === ".gitattributes" ||
    normalized.startsWith(".githooks/") ||
    normalized.startsWith(".git/") ||
    normalized.startsWith(".next/") ||
    normalized.startsWith(".agents/") ||
    normalized.endsWith(".tsbuildinfo")
  ) {
    return false
  }

  // If the file is only package-lock.json, don't count it alone as code change
  if (normalized === "package-lock.json") {
    return false
  }

  // Key application directories
  if (
    normalized.startsWith("app/") ||
    normalized.startsWith("components/") ||
    normalized.startsWith("lib/") ||
    normalized.startsWith("public/") ||
    normalized.startsWith("supabase/") ||
    normalized.startsWith("scripts/")
  ) {
    return true
  }

  // Root configuration files
  const rootConfigs = new Set([
    "package.json",
    "tsconfig.json",
    "components.json",
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "postcss.config.mjs",
    "postcss.config.js",
    "eslint.config.mjs",
    "eslint.config.js",
    "proxy.ts"
  ])

  if (rootConfigs.has(normalized)) {
    return true
  }

  // Generic code file extensions
  if (/\.(tsx?|jsx?|mjs|cjs|css|sql)$/i.test(normalized)) {
    return true
  }

  return false
}

/**
 * Checks if any file in a list of staged files triggers an automatic version bump.
 *
 * @param {string[]} stagedFiles
 * @returns {boolean}
 */
export function shouldBumpVersion(stagedFiles) {
  if (!Array.isArray(stagedFiles) || stagedFiles.length === 0) {
    return false
  }

  // Filter out empty lines
  const nonAppOnly = stagedFiles.filter(Boolean).filter(isAppFile)
  
  // If the ONLY staged app file is package.json and nothing else changed, check if dependencies changed
  // If package.json is the ONLY file staged, it might be an isolated metadata update
  return nonAppOnly.length > 0
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
    packageLockPath
  }
}
