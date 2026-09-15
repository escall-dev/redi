"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState } from "react"
import { loginAction, type AuthActionResult } from "@/app/actions/auth"
import { RediBrand } from "@/components/brand/redi-brand"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, AlertCircle, Loader2, Shield } from "lucide-react"

export function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get("redirect") || "/dashboard"
  const [showPassword, setShowPassword] = React.useState(false)

  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    loginAction,
    null
  )

  return (
    <div className="w-full space-y-6">
      {/* Header & Branding */}
      <div className="flex flex-col items-center text-center space-y-3">
        <RediBrand size="lg" withLink={false} />
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue to Redi.
          </p>
        </div>
      </div>

      {/* Login Card */}
      <Card>
        <CardHeader className="sr-only">
          <h2>Sign in form</h2>
        </CardHeader>

        <CardContent className="pt-6">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTarget} />

            {/* Error Feedback */}
            {state?.error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{state.error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isPending}
                className="h-11 sm:h-10"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
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
                  className="h-11 sm:h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40"
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
            <div className="flex items-center justify-between pt-0.5">
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 text-sm font-medium mt-2"
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
      <div className="text-center space-y-4">
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
          <span>Developed by Escall</span>
        </div>
      </div>
    </div>
  )
}
