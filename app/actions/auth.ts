"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export interface AuthActionResult {
  success?: boolean
  error?: string
  message?: string
  requiresEmailConfirmation?: boolean
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Server Action: Log in with email and password
 */
export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const redirectUrl = (formData.get("redirect") as string) || "/dashboard"

  if (!email || !isValidEmail(email)) {
    return { success: false, error: "Please enter a valid email address." }
  }

  if (!password) {
    return { success: false, error: "Please enter your password." }
  }

  let targetRedirect: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        return {
          success: false,
          error: "Your email has not been confirmed yet. Please check your inbox.",
        }
      }
      return {
        success: false,
        error: "Invalid email or password.",
      }
    }

    if (data.user) {
      // Ensure profile exists upon successful login
      const displayName = data.user.user_metadata?.display_name || null
      await supabase.from("profiles").upsert(
        {
          user_id: data.user.id,
          display_name: displayName,
        },
        { onConflict: "user_id" }
      )
      targetRedirect = redirectUrl.startsWith("/") ? redirectUrl : "/dashboard"
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err
    }
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    }
  }

  if (targetRedirect) {
    redirect(targetRedirect)
  }

  return { success: true }
}

/**
 * Server Action: Register new user and link profile
 */
export async function registerAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const displayName = (formData.get("displayName") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!displayName || displayName.length < 2) {
    return {
      success: false,
      error: "Please enter your name (at least 2 characters).",
    }
  }

  if (!email || !isValidEmail(email)) {
    return { success: false, error: "Please enter a valid email address." }
  }

  if (!password || password.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters long.",
    }
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: "Passwords do not match.",
    }
  }

  let targetRedirect: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    })

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        return {
          success: false,
          error: "An account with this email address already exists.",
        }
      }
      return {
        success: false,
        error: error.message || "Failed to create account. Please try again.",
      }
    }

    if (data.user) {
      // If immediate session is established (email confirmation disabled in Supabase)
      if (data.session) {
        // Create initial profile record securely using authenticated user ID
        await supabase.from("profiles").upsert(
          {
            user_id: data.user.id,
            display_name: displayName,
          },
          { onConflict: "user_id" }
        )
        targetRedirect = "/dashboard"
      } else {
        // Email confirmation is required by Supabase project settings
        return {
          success: true,
          requiresEmailConfirmation: true,
          message:
            "Account created! Please check your email to verify your account before logging in.",
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err
    }
    return {
      success: false,
      error: "An unexpected error occurred during registration.",
    }
  }

  if (targetRedirect) {
    redirect(targetRedirect)
  }

  return { success: true }
}

/**
 * Server Action: Log out user and clear session cookies
 */
export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {
    // Ignore error and proceed with redirect
  }
  redirect("/login")
}
