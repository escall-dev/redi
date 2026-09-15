/**
 * Redi Site URL & Environment Configuration
 *
 * Ensures clean, environment-aware resolution of the site URL
 * across local development (localhost:3000) and Vercel production.
 */

export function getSiteUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000"

  url = url.trim()

  // Ensure protocol is present
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`
  }

  // Remove trailing slashes
  return url.replace(/\/+$/, "")
}
