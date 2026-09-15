import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Route Handler: /auth/confirm
 *
 * Handles email verification links from Supabase Auth across local and production.
 * Supports both token_hash (OTP) and PKCE code exchange.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/onboarding"

  // Open redirect protection: Ensure next is a safe relative internal route
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/onboarding"

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = next
  redirectUrl.searchParams.delete("token_hash")
  redirectUrl.searchParams.delete("type")
  redirectUrl.searchParams.delete("code")
  redirectUrl.searchParams.delete("next")

  const supabase = await createClient()

  // 1. Verify via token_hash (standard Supabase email template)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Ensure profile row exists securely for verified user
        await supabase.from("profiles").upsert(
          {
            user_id: user.id,
            display_name: user.user_metadata?.display_name || null,
          },
          { onConflict: "user_id" }
        )
      }

      return NextResponse.redirect(redirectUrl)
    }
  }

  // 2. Verify via PKCE auth code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase.from("profiles").upsert(
          {
            user_id: user.id,
            display_name: user.user_metadata?.display_name || null,
          },
          { onConflict: "user_id" }
        )
      }

      return NextResponse.redirect(redirectUrl)
    }
  }

  // If verification failed or token expired, redirect to login with a friendly message
  redirectUrl.pathname = "/login"
  redirectUrl.searchParams.set("error", "verification_failed")
  return NextResponse.redirect(redirectUrl)
}
