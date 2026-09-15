import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseEnv } from "./config"

/**
 * Updates user session in middleware by reading cookies from the incoming request
 * and writing refreshed tokens to the outgoing response.
 */
export async function updateSession(request: NextRequest) {
  const { url, key, isConfigured } = getSupabaseEnv()

  // If Supabase is not configured yet, pass through without interruption
  if (!isConfigured || !url || !key) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh auth token if expired
  await supabase.auth.getUser()

  return response
}
