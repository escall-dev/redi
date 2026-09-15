import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseEnv } from "./config"
import type { Database } from "./types"

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

/**
 * Updates user session in middleware by reading cookies from the incoming request,
 * refreshing auth tokens, and enforcing onboarding & route protection rules.
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
        cookiesToSet.forEach(({ name, value, options }) => {
          const isDelete = value === "" || options?.maxAge === 0
          response.cookies.set(name, value, {
            ...options,
            maxAge: isDelete ? 0 : (options?.maxAge || ONE_YEAR_IN_SECONDS),
            sameSite: options?.sameSite || "lax",
            path: options?.path || "/",
          })
        })
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
  const isOnboardingRoute = pathname === "/onboarding"
  const isAuthRoute = pathname === "/login" || pathname === "/register"
  const isRoot = pathname === "/"

  const isServerAction = request.headers.has("next-action")

  // 1. Unauthenticated user on protected route or /onboarding -> /login
  // Skip Server Action requests so the action executor can handle authentication & redirects cleanly
  if (!user && (isProtectedRoute || isOnboardingRoute) && !isServerAction) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    if (pathname !== "/dashboard" && pathname !== "/onboarding") {
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

  // 3. Authenticated user routing
  if (user) {
    // Check onboarding status from profiles
    let isOnboarded = false
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single()

      isOnboarded = Boolean(profile?.onboarding_completed)
    } catch {
      isOnboarded = false
    }

    // A. Authenticated user visiting /login or /register
    if (isAuthRoute) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = isOnboarded ? "/dashboard" : "/onboarding"
      redirectUrl.searchParams.delete("redirect")
      const redirectResponse = NextResponse.redirect(redirectUrl)
      response.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value, c)
      })
      return redirectResponse
    }

    // B. Authenticated user visiting root /
    if (isRoot) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = isOnboarded ? "/dashboard" : "/onboarding"
      const redirectResponse = NextResponse.redirect(redirectUrl)
      response.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value, c)
      })
      return redirectResponse
    }

    // C. Authenticated user on /onboarding who has ALREADY completed onboarding -> /dashboard
    if (isOnboardingRoute && isOnboarded) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/dashboard"
      const redirectResponse = NextResponse.redirect(redirectUrl)
      response.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value, c)
      })
      return redirectResponse
    }

    // D. Authenticated user on protected app routes whose onboarding is INCOMPLETE -> /onboarding
    if (isProtectedRoute && !isOnboarded && !isServerAction) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/onboarding"
      const redirectResponse = NextResponse.redirect(redirectUrl)
      response.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value, c)
      })
      return redirectResponse
    }
  }

  return response
}
