"use client"

import * as React from "react"
import { useActionState } from "react"
import { saveOnboardingAction, type OnboardingActionResult } from "@/app/actions/onboarding"
import { RediBrand } from "@/components/brand/redi-brand"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { AlertCircle, Loader2, Sparkles, Shield } from "lucide-react"

interface OnboardingFormProps {
  initialDisplayName?: string
}

export function OnboardingForm({ initialDisplayName = "" }: OnboardingFormProps) {
  const [displayName, setDisplayName] = React.useState(initialDisplayName)
  const [lastPeriodStart, setLastPeriodStart] = React.useState("")
  const [cycleLength, setCycleLength] = React.useState("28")
  const [clientError, setClientError] = React.useState<string | null>(null)

  const [state, formAction, isPending] = useActionState<OnboardingActionResult | null, FormData>(
    saveOnboardingAction,
    null
  )

  const todayStr = new Date().toISOString().split("T")[0]

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setClientError(null)

    if (!displayName || displayName.trim().length < 2) {
      e.preventDefault()
      setClientError("Please enter a display name (at least 2 characters).")
      return
    }

    if (!lastPeriodStart) {
      e.preventDefault()
      setClientError("Please select the date when your last period started.")
      return
    }

    if (lastPeriodStart > todayStr) {
      e.preventDefault()
      setClientError("Last period start date cannot be in the future.")
      return
    }

    const num = parseInt(cycleLength, 10)
    if (isNaN(num) || num < 21 || num > 45) {
      e.preventDefault()
      setClientError("Typical cycle length should be between 21 and 45 days.")
      return
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header & Brand */}
      <div className="flex flex-col items-center text-center space-y-3">
        <RediBrand size="lg" withLink={false} />
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lavender text-lavender-foreground text-xs font-medium mb-1">
            <Sparkles className="size-3" />
            <span>Welcome to Redi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Let&apos;s get to know you
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            A few details will help Redi personalize your cycle tracking.
          </p>
        </div>
      </div>

      {/* Onboarding Card */}
      <Card className="border-border/80 shadow-redi-sm">
        <CardHeader className="sr-only">
          <h2>Personalize your cycle tracking</h2>
        </CardHeader>

        <CardContent className="pt-6">
          <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
            {/* Error Feedback */}
            {(clientError || state?.error) && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{clientError || state?.error}</span>
              </div>
            )}

            {/* 1. Display Name */}
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Your Name or Nickname</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                placeholder="e.g. Maya"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                required
                disabled={isPending}
                className="h-11 sm:h-10"
              />
              <p className="text-xs text-muted-foreground">
                How Redi will greet you on your dashboard.
              </p>
            </div>

            {/* 2. Last Period Start Date */}
            <div className="space-y-1.5">
              <Label htmlFor="lastPeriodStart">When did your last period start?</Label>
              <DatePicker
                id="lastPeriodStart"
                name="lastPeriodStart"
                value={lastPeriodStart}
                onChange={setLastPeriodStart}
                maxDate={todayStr}
                placeholder="Choose a date"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Select the first day of bleeding from your most recent period.
              </p>
            </div>

            {/* 3. Typical Cycle Length */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="typicalCycleLength">Typical Cycle Length</Label>
                <span className="text-xs font-medium text-primary bg-lavender px-2 py-0.5 rounded-md">
                  {cycleLength} days
                </span>
              </div>
              <div className="relative flex items-center">
                <Input
                  id="typicalCycleLength"
                  name="typicalCycleLength"
                  type="number"
                  min={21}
                  max={45}
                  value={cycleLength}
                  onChange={(e) => setCycleLength(e.target.value)}
                  required
                  disabled={isPending}
                  className="h-11 sm:h-10 pr-14"
                />
                <span className="absolute right-3.5 text-xs text-muted-foreground font-medium pointer-events-none">
                  days
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                The count from day 1 of one period to day 1 of the next (typically 28 days).
              </p>
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
                  Saving your details...
                </>
              ) : (
                "Continue to Dashboard"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Privacy note */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80">
          <Shield className="size-3.5 text-primary" />
          <span>Encrypted on device • Stored privately</span>
        </div>
      </div>
    </div>
  )
}
