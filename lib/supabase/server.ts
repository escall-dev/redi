import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { assertSupabaseConfigured, getSupabaseEnv } from "./config"
import type { Database } from "./types"

export interface CreateClientOptions {
  rememberMe?: boolean
}

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers using Next.js App Router cookie store.
 */
export async function createClient(customOptions?: CreateClientOptions) {
  const { url, key } = assertSupabaseConfigured()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        const rememberMeCookie = cookieStore.get("sb-remember-me")?.value
        const isPersistent =
          customOptions?.rememberMe !== undefined
            ? customOptions.rememberMe
            : rememberMeCookie !== "false"

        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOpts = { ...options }
            if (!isPersistent) {
              delete cookieOpts.maxAge
              delete cookieOpts.expires
            }
            cookieStore.set(name, value, cookieOpts)
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
        const rememberMeCookie = cookieStore.get("sb-remember-me")?.value
        const isPersistent = rememberMeCookie !== "false"

        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOpts = { ...options }
            if (!isPersistent) {
              delete cookieOpts.maxAge
              delete cookieOpts.expires
            }
            cookieStore.set(name, value, cookieOpts)
          })
        } catch {
          // Ignored in Server Components
        }
      },
    },
  })
}
