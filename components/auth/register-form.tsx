"use client"

import * as React from "react"
import Link from "next/link"
import { useActionState } from "react"
import { registerAction, type AuthActionResult } from "@/app/actions/auth"
import { RediLogo } from "@/components/brand/redi-logo"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function RegisterForm() {
  const [showPassword, setShowPassword] = React.useState(false)
  const [selectedSex, setSelectedSex] = React.useState<string>("")
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

    if (!selectedSex) {
      e.preventDefault()
      setClientError("Please select an option for sex.")
      return
    }
  }

  return (
    <div className="w-full space-y-7 max-w-md mx-auto py-2">
      {/* Header & Logo Section */}
      <div className="flex flex-col items-center text-center space-y-3">
        {/* Highlighted Standalone Seijun Tulip Logo */}
        <div className="relative flex items-center justify-center pt-2 pb-1">
          <div
            className="absolute size-24 rounded-full bg-primary/15 dark:bg-primary/25 blur-xl pointer-events-none -z-10"
            aria-hidden="true"
          />
          <RediLogo size="xl" className="drop-shadow-md transition-transform hover:scale-105 duration-300" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Create Account
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Start keeping your cycle records calm, personal, and strictly private.
          </p>
        </div>
      </div>

          {state?.requiresEmailConfirmation ? (
            /* Email Verification Notice */
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-lavender text-primary border border-lavender-border/70 shadow-xs">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold text-foreground">Check your inbox</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {state.message || "We sent a confirmation link to your email. Click the link to activate your account."}
                </p>
              </div>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "default" }), "w-full h-11 rounded-xl mt-3 shadow-redi-sm")}
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
              <div className="space-y-1.5 text-left">
                <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  placeholder="e.g. Maya"
                  autoComplete="name"
                  required
                  disabled={isPending}
                  className="h-11 rounded-xl border-input/80 bg-background/50 focus-visible:ring-primary/25"
                />
              </div>

              {/* Email */}
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

              {/* Password */}
              <div className="space-y-1.5 text-left">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div className="space-y-1.5 text-left">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  disabled={isPending}
                  className="h-11 rounded-xl border-input/80 bg-background/50 focus-visible:ring-primary/25"
                />
              </div>

              {/* Sex */}
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">
                    Sex
                  </Label>
                  <span className="text-xs text-muted-foreground">Required</span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Sex"
                  className="grid grid-cols-3 gap-1 rounded-xl bg-background/80 dark:bg-card/90 p-1 border border-border/70 shadow-xs w-full"
                >
                  {[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "prefer_not_to_say", label: "Prefer not to say" },
                  ].map((option) => {
                    const isChecked = selectedSex === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isChecked}
                        onClick={() => {
                          setSelectedSex(option.value)
                          setClientError(null)
                        }}
                        disabled={isPending}
                        className={cn(
                          "inline-flex items-center justify-center px-1.5 py-2 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-all duration-150 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95 text-center",
                          isChecked
                            ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                          isPending && "opacity-50 pointer-events-none"
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                      </button>
                    )
                  })}
                </div>
                <input type="hidden" name="sex" value={selectedSex} />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-11 text-sm font-medium rounded-xl mt-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-redi-sm transition-all"
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

      {/* Switch to Login */}
      <div className="text-center space-y-3">
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
          <RediLogo size="xs" />
          <span>Developed by Alex for Redge</span>
        </div>
      </div>
    </div>
  )
}
