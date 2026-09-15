import { createBrowserClient } from "@supabase/ssr"
import { assertSupabaseConfigured, getSupabaseEnv } from "./config"

/**
 * Creates a Supabase client for use in Client Components (browser-side).
 * Reuses client instance within the browser session.
 */
export function createClient() {
  const { url, key } = assertSupabaseConfigured()
  return createBrowserClient(url, key)
}

/**
 * Safe getter that returns null if Supabase credentials are not configured yet,
 * preventing unhandled exceptions during initial setup or unconfigured environments.
 */
export function getOptionalClient() {
  const { url, key, isConfigured } = getSupabaseEnv()
  if (!isConfigured || !url || !key) {
    return null
  }
  return createBrowserClient(url, key)
}
