import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseEnv } from "./config"
import type { Database } from "./types"

/**
 * Updates user session in middleware by reading cookies from the incoming request,
 * refreshing auth tokens, and enforcing route protection rules.
 */
export async function updateSession(request: NextRequest) {
  const { url, key, isConfigured } = getSupabaseEnv()

  // If Supabase is not configured, allow request through
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

  const supabase = createServerClient<Database>(url, key, {
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

  // Validate session and refresh tokens if needed
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protected routes
  const protectedRoutes = ["/dashboard", "/calendar", "/cycles", "/settings"]
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
  const isAuthRoute = pathname === "/login" || pathname === "/register"
  const isRoot = pathname === "/"

  // 1. Unauthenticated user on protected route -> /login
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    if (pathname !== "/dashboard") {
      redirectUrl.searchParams.set("redirect", pathname)
    }
    const redirectResponse = NextResponse.redirect(redirectUrl)
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value, c)
    })
    return redirectResponse
  }

  // 2. Unauthenticated user on root / -> /login
  if (!user && isRoot) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    const redirectResponse = NextResponse.redirect(redirectUrl)
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value, c)
    })
    return redirectResponse
  }

  // 3. Authenticated user visiting /login, /register, or root / -> /dashboard
  if (user && (isAuthRoute || isRoot)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    redirectUrl.searchParams.delete("redirect")
    const redirectResponse = NextResponse.redirect(redirectUrl)
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value, c)
    })
    return redirectResponse
  }

  return response
}
