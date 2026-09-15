import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { assertSupabaseConfigured, getSupabaseEnv } from "./config"
import type { Database } from "./types"

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers using Next.js App Router cookie store.
 */
export async function createClient() {
  const { url, key } = assertSupabaseConfigured()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if middleware is refreshing user sessions.
        }
      },
    },
  })
}

/**
 * Safe getter that returns null if Supabase credentials are not configured yet,
 * preventing unhandled server exceptions during initial setup.
 */
export async function getOptionalClient() {
  const { url, key, isConfigured } = getSupabaseEnv()
  if (!isConfigured || !url || !key) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Ignored in Server Components
        }
      },
    },
  })
}
