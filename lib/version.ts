import packageJson from "../package.json" with { type: "json" }

/**
 * Authoritative Canonical Application Version
 *
 * Sourced directly from package.json.
 *
 * Rules:
 * - Code changes do NOT change this version.
 * - Git commits do NOT change this version.
 * - Vercel deployments do NOT change this version.
 * - Build IDs and PWA cache versions remain independent.
 * - Only intentional Semantic Versioning releases (MAJOR.MINOR.PATCH) update this value.
 */
export const APP_VERSION: string = packageJson.version

/**
 * Formatted display label (e.g. "v1.18.4")
 */
export const APP_VERSION_LABEL: string = `v${packageJson.version}`
