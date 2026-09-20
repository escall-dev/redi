import packageJson from "@/package.json"

/**
 * Authoritative application version sourced directly from package.json.
 * Any automatic or manual update to package.json is dynamically reflected here.
 */
export const APP_VERSION: string = packageJson.version
