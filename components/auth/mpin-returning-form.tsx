"use client"

import * as React from "react"
import { RediLogo } from "@/components/brand/redi-logo"
import { SeijunSkyline } from "@/components/brand/seijun-skyline"
import { MpinInput } from "@/components/auth/mpin-input"
import { verifyMpin, getAttemptState } from "@/lib/auth/mpin-storage"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, Shield, Sparkles, Lock, Loader2 } from "lucide-react"

export interface MpinReturningUser {
  id: string
  email?: string
  displayName?: string | null
}

export interface MpinReturningFormProps {
  user: MpinReturningUser
  onSuccess: () => void
  onSwitchAccount: () => void
  onForgotMpin: () => void
  version?: string
}

function maskEmail(email?: string): string {
  if (!email) return "Account Authenticated"
  const [local, domain] = email.split("@")
  if (!domain) return email
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`
  }
  return `${local.slice(0, 3)}***@${domain}`
}

export function MpinReturningForm({
  user,
  onSuccess,
  onSwitchAccount,
  onForgotMpin,
  version,
}: MpinReturningFormProps) {
  const [mpin, setMpin] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [isLockedOut, setIsLockedOut] = React.useState(false)
  const [lockedSeconds, setLockedSeconds] = React.useState(0)

  // Check initial attempt lockout status
  React.useEffect(() => {
    const attempt = getAttemptState(user.id)
    if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
      const remaining = Math.ceil((attempt.lockedUntil - Date.now()) / 1000)
      setIsLockedOut(true)
      setLockedSeconds(remaining)
      setError(`Too many failed attempts. Locked for ${remaining}s.`)
    }
  }, [user.id])

  // Countdown timer for lockout
  React.useEffect(() => {
    if (!isLockedOut || lockedSeconds <= 0) return

    const timer = setInterval(() => {
      setLockedSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsLockedOut(false)
          setError(null)
          return 0
        }
        const updated = prev - 1
        setError(`Too many failed attempts. Locked for ${updated}s.`)
        return updated
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isLockedOut, lockedSeconds])

  const handleVerify = React.useCallback(
    async (codeToVerify: string) => {
      if (isVerifying || isLockedOut || codeToVerify.length !== 6) return

      setIsVerifying(true)
      setError(null)

      try {
        const result = await verifyMpin(user.id, codeToVerify)
        if (result.success) {
          onSuccess()
          return
        }

        setError(result.error || "Incorrect MPIN. Please try again.")
        setMpin("")

        if (result.isLockedOut && result.lockedSecondsRemaining) {
          setIsLockedOut(true)
          setLockedSeconds(result.lockedSecondsRemaining)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to verify MPIN.")
        setMpin("")
      } finally {
        setIsVerifying(false)
      }
    },
    [isVerifying, isLockedOut, user.id, onSuccess]
  )

  const handleComplete = (code: string) => {
    handleVerify(code)
  }

  const displayName =
    user.displayName?.trim() ||
    (user.email ? user.email.split("@")[0] : null) ||
    "User"

  return (
    <div className="w-full space-y-6 max-w-md mx-auto">
      <Card className="relative overflow-hidden border border-lavender-border/80 bg-card shadow-redi-card rounded-3xl transition-all">
        <CardContent className="pt-8 pb-4 px-5 sm:px-8 space-y-6">
          {/* Header & Logo Section matching reference design */}
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Top Trio Badges matching eGovPH layout */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <div className="size-11 rounded-full bg-lavender/60 border border-lavender-border/80 flex items-center justify-center text-primary shadow-xs">
                <Sparkles className="size-5" />
              </div>
              <div className="size-13 rounded-full bg-lavender/90 border border-primary/30 flex items-center justify-center p-2 shadow-xs">
                <RediLogo size="md" className="drop-shadow-xs" />
              </div>
              <div className="size-11 rounded-full bg-lavender/60 border border-lavender-border/80 flex items-center justify-center text-primary shadow-xs">
                <Lock className="size-5" />
              </div>
            </div>

            {/* App Brand Name */}
            <div className="pt-1">
              <span className="text-xl font-bold tracking-widest text-primary uppercase font-mono">
                SEIJUN
              </span>
            </div>

            {/* Welcome Back & Subtitle */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Welcome back, {displayName.toUpperCase()}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter your 6-digit MPIN
              </p>
            </div>
          </div>

          {/* Feedback error alert if any */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* MPIN Input with Clear Button */}
          <div className="space-y-4 pt-1">
            <MpinInput
              value={mpin}
              onChange={setMpin}
              onComplete={handleComplete}
              disabled={isVerifying || isLockedOut}
              error={Boolean(error)}
              label="Enter your MPIN"
              showClear={true}
              onClear={() => setError(null)}
              autoFocus={true}
            />

            {/* Verifying Indicator */}
            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-xs text-primary animate-pulse pt-1">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Verifying MPIN...</span>
              </div>
            )}

            {/* Forgot MPIN link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onForgotMpin}
                disabled={isVerifying}
                className="text-sm font-semibold text-primary hover:underline underline-offset-4 cursor-pointer"
              >
                Forgot MPIN?
              </button>
            </div>
          </div>

          {/* User Email Pill & Switch Account matching reference image */}
          <div className="flex flex-col items-center justify-center pt-8 pb-3 space-y-3">
            <div className="inline-flex items-center justify-center max-w-full px-5 py-2 rounded-xl bg-blue-50/80 dark:bg-primary/10 border border-blue-100/80 dark:border-primary/20 text-sm font-medium text-slate-700 dark:text-slate-200 tracking-normal shadow-2xs truncate">
              {user.email || "Authenticated Account"}
            </div>

            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <span>Not you?</span>
              <button
                type="button"
                onClick={onSwitchAccount}
                disabled={isVerifying}
                className="font-semibold text-primary hover:underline underline-offset-4 cursor-pointer"
              >
                Switch Account
              </button>
            </div>
          </div>

          {/* Brand Skyline Illustration matching reference layout */}
          <div className="pt-2 -mx-5 sm:-mx-8 -mb-4">
            <SeijunSkyline />
          </div>

          {/* Version badge */}
          {version && (
            <div className="flex justify-end pt-1">
              <span className="text-[10px] text-muted-foreground/50 select-none tracking-tight font-mono">
                v{version}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
          <Shield className="size-3.5 text-primary" />
          <span>Secured with client-side Web Crypto PBKDF2</span>
        </div>
      </div>
    </div>
  )
}
