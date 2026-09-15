"use client"

import * as React from "react"
import Link from "next/link"
import { useActionState } from "react"
import { registerAction, type AuthActionResult } from "@/app/actions/auth"
import { RediBrand } from "@/components/brand/redi-brand"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

export function RegisterForm() {
  const [showPassword, setShowPassword] = React.useState(false)
  const [clientError, setClientError] = React.useState<string | null>(null)

  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    registerAction,
    null
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setClientError(null)
    const form = e.currentTarget
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.value

    if (password && password.length < 6) {
      e.preventDefault()
      setClientError("Password must be at least 6 characters long.")
      return
    }

    if (password !== confirmPassword) {
      e.preventDefault()
      setClientError("Passwords do not match.")
      return
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header & Branding */}
      <div className="flex flex-col items-center text-center space-y-3">
        <RediBrand size="lg" withLink={false} />
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Create your Redi account
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Start keeping your cycle information private and organized.
          </p>
        </div>
      </div>

      {/* Registration Card */}
      <Card className="border-border/80 shadow-redi-sm">
        <CardHeader className="sr-only">
          <h2>Registration form</h2>
        </CardHeader>

        <CardContent className="pt-6">
          {state?.requiresEmailConfirmation ? (
            /* Email Verification Notice */
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-lavender text-primary border border-lavender-border/70">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Check your inbox</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {state.message || "We sent a confirmation link to your email. Confirm your account to complete registration."}
                </p>
              </div>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "default" }), "w-full h-11 mt-2")}
              >
                Continue to Sign In
              </Link>
            </div>
          ) : (
            <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
              {/* Error Feedback (Client or Server) */}
              {(clientError || state?.error) && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{clientError || state?.error}</span>
                </div>
              )}

              {/* Display Name */}
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  placeholder="e.g. Maya"
                  autoComplete="name"
                  required
                  disabled={isPending}
                  className="h-11 sm:h-10"
                />
              </div>

              {/* Email */}
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

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  disabled={isPending}
                  className="h-11 sm:h-10"
                />
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
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Switch to Login */}
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
          <Shield className="size-3.5 text-primary" />
          <span>Zero third-party trackers • Your data is private</span>
        </div>
      </div>
    </div>
  )
}
