"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState } from "react"
import { loginAction, type AuthActionResult } from "@/app/actions/auth"
import { RediLogo } from "@/components/brand/redi-logo"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react"

export function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get("redirect") || "/dashboard"
  const urlError = searchParams.get("error")
  const urlVerified = searchParams.get("verified") === "true"
  const [showPassword, setShowPassword] = React.useState(false)

  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    loginAction,
    null
  )

  const errorMessage =
    state?.error ||
    (urlError === "verification_failed"
      ? "The verification link is invalid or has expired. Please sign in or request a new link."
      : null)

  return (
    <div className="w-full space-y-6">
      {/* Elevated Login Card */}
      <Card className="border border-lavender-border/80 bg-card shadow-redi-card rounded-2xl sm:rounded-3xl transition-all">
        <CardContent className="pt-8 pb-8 px-5 sm:px-8 space-y-6">
          {/* Header & Logo Section inside the card */}
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Prominent Authentic Redi SVG Icon */}
            <div className="relative flex items-center justify-center p-2 rounded-2xl bg-lavender/50 border border-lavender-border/60 shadow-xs">
              <RediLogo size="lg" className="drop-shadow-sm" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sign in to your private cycle tracker.
              </p>
            </div>
          </div>

          {/* Feedback Banners */}
          {urlVerified && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-success-border/60 bg-success-soft p-3 text-sm text-success-foreground"
            >
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-success" />
              <span className="leading-snug">
                Your email has been confirmed! You can now sign in.
              </span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTarget} />

            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isPending}
                className="h-11 rounded-xl border-input/80 bg-background/50 focus-visible:ring-primary/25"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="h-11 pr-11 rounded-xl border-input/80 bg-background/50 focus-visible:ring-primary/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5 transition-colors rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label
                htmlFor="rememberMe"
                className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  defaultChecked
                  disabled={isPending}
                  className="size-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            {/* Primary Action Button */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 text-sm font-medium rounded-xl mt-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-redi-sm transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Switch to Register */}
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
          <Shield className="size-3.5 text-primary" />
          <span>Zero third-party trackers • Strictly confidential</span>
        </div>
      </div>
    </div>
  )
}
