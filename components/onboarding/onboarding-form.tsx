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
import {
  AlertCircle,
  Loader2,
  Sparkles,
  Shield,
  CalendarHeart,
  HeartHandshake,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface OnboardingFormProps {
  initialDisplayName?: string
}

type UsageRole = "cycle_tracker" | "supporter" | "both"

export function OnboardingForm({ initialDisplayName = "" }: OnboardingFormProps) {
  const [step, setStep] = React.useState<1 | 2>(1)
  const [usageRole, setUsageRole] = React.useState<UsageRole | null>(null)
  const [displayName, setDisplayName] = React.useState(initialDisplayName)
  const [lastPeriodStart, setLastPeriodStart] = React.useState("")
  const [cycleLength, setCycleLength] = React.useState("28")
  const [clientError, setClientError] = React.useState<string | null>(null)

  const [state, formAction, isPending] = useActionState<OnboardingActionResult | null, FormData>(
    saveOnboardingAction,
    null
  )

  const todayStr = React.useMemo(() => new Date().toISOString().split("T")[0], [])

  const handleNextStep = () => {
    setClientError(null)
    if (!usageRole) {
      setClientError("Please select how you will use Seijun.")
      return
    }
    setStep(2)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setClientError(null)

    if (!usageRole) {
      e.preventDefault()
      setClientError("Please select how you will use Seijun.")
      setStep(1)
      return
    }

    if (!displayName || displayName.trim().length < 2) {
      e.preventDefault()
      setClientError("Please enter a display name (at least 2 characters).")
      return
    }

    // Only validate cycle details for cycle trackers and both
    if (usageRole === "cycle_tracker" || usageRole === "both") {
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
  }

  const ROLE_OPTIONS = [
    {
      value: "cycle_tracker" as UsageRole,
      title: "Track my own cycle",
      description: "Log periods, symptoms, and receive personalized cycle and fertile window insights.",
      icon: CalendarHeart,
      badge: "Cycle Owner",
    },
    {
      value: "supporter" as UsageRole,
      title: "Support someone else's cycle",
      description: "Help a partner or loved one manage their cycle and stay informed with care.",
      icon: HeartHandshake,
      badge: "Partner / Supporter",
    },
    {
      value: "both" as UsageRole,
      title: "Both",
      description: "Track your personal menstrual cycle while also being available to support someone else.",
      icon: Sparkles,
      badge: "Tracker & Supporter",
    },
  ]

  return (
    <div className="w-full space-y-6">
      {/* Header & Brand */}
      <div className="flex flex-col items-center text-center space-y-3">
        <RediBrand size="lg" withLink={false} />
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lavender text-lavender-foreground text-xs font-medium mb-1">
            <Sparkles className="size-3" />
            <span>Welcome to Seijun • Step {step} of 2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {step === 1
              ? "How will you use Seijun?"
              : usageRole === "supporter"
              ? "Set up your supporter profile"
              : "Let's get to know you"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {step === 1
              ? "Choose your intended role. You can customize permissions and partner links later."
              : usageRole === "supporter"
              ? "Confirm your name so your partner or friend will recognize you when connecting."
              : "A few details will help Seijun personalize your cycle calculations."}
          </p>
        </div>
      </div>

      {/* Onboarding Card */}
      <Card className="border border-lavender-border/80 bg-card shadow-redi-card rounded-2xl sm:rounded-3xl">
        <CardHeader className="sr-only">
          <h2>
            {step === 1
              ? "Choose how you will use Seijun"
              : usageRole === "supporter"
              ? "Supporter profile setup"
              : "Cycle tracking details"}
          </h2>
        </CardHeader>

        <CardContent className="pt-6 pb-6 px-5 sm:px-8">
          {/* Error Feedback */}
          {(clientError || state?.error) && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive mb-5"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{clientError || state?.error}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Usage Role Selection */
            <div className="space-y-5">
              <div
                role="radiogroup"
                aria-label="How will you use Seijun?"
                className="space-y-3"
              >
                {ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = usageRole === opt.value

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setUsageRole(opt.value)
                        setClientError(null)
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 relative select-none cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40",
                        isSelected
                          ? "border-primary bg-lavender/40 shadow-xs ring-1 ring-primary/30"
                          : "border-border/80 bg-background/50 hover:bg-muted/40 hover:border-border"
                      )}
                    >
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors mt-0.5",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-secondary text-muted-foreground"
                        )}
                      >
                        <Icon className="size-5" />
                      </div>

                      <div className="space-y-1 flex-1 pr-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm sm:text-base">
                            {opt.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {opt.description}
                        </p>
                      </div>

                      <div
                        className={cn(
                          "size-5 rounded-full border flex items-center justify-center shrink-0 transition-colors mt-1",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-background"
                        )}
                      >
                        {isSelected && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Step 1 Continue Button */}
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={!usageRole}
                className="w-full h-11 text-sm font-medium rounded-xl shadow-redi-sm flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : (
            /* STEP 2: Branching setup form */
            <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
              {/* Hidden Usage Role Field */}
              <input type="hidden" name="usageRole" value={usageRole || ""} />

              {/* 1. Display Name */}
              <div className="space-y-1.5 text-left">
                <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
                  Your Name or Nickname
                </Label>
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
                  className="h-11 rounded-xl border-input/80 bg-background/50 focus-visible:ring-primary/25"
                />
                <p className="text-xs text-muted-foreground">
                  How Seijun will greet you on your dashboard.
                </p>
              </div>

              {usageRole === "supporter" ? (
                /* Supporter Mode Callout */
                <div className="rounded-2xl border border-lavender-border/80 bg-lavender/30 p-4 space-y-2 text-left">
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    <HeartHandshake className="size-4.5 shrink-0" />
                    <span>Personal cycle setup skipped</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Because you are supporting someone else, you don&apos;t need to enter menstrual
                    cycle dates or lengths. When Partner Connections launch, you&apos;ll be able to
                    link with their account and support their cycle.
                  </p>
                </div>
              ) : (
                /* Cycle Tracker / Both: Cycle Setup Fields */
                <>
                  {usageRole === "both" && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 flex items-center gap-2 text-xs text-foreground">
                      <Sparkles className="size-4 text-primary shrink-0" />
                      <span>
                        You&apos;ll have full personal cycle tracking now, and can link to support a
                        partner once connections launch.
                      </span>
                    </div>
                  )}

                  {/* 2. Last Period Start Date */}
                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="lastPeriodStart" className="text-sm font-medium text-foreground">
                      When did your last period start?
                    </Label>
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
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="typicalCycleLength" className="text-sm font-medium text-foreground">
                        Typical Cycle Length
                      </Label>
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
                        className="h-11 rounded-xl border-input/80 bg-background/50 focus-visible:ring-primary/25 pr-14"
                      />
                      <span className="absolute right-3.5 text-xs text-muted-foreground font-medium pointer-events-none">
                        days
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The count from day 1 of one period to day 1 of the next (typically 28 days).
                    </p>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setClientError(null)
                  }}
                  disabled={isPending}
                  className="w-full sm:w-auto h-11 rounded-xl text-sm font-medium border-border/80"
                >
                  <ArrowLeft className="size-4 mr-1.5" />
                  Back
                </Button>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:flex-1 h-11 text-sm font-medium rounded-xl shadow-redi-sm"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Saving your details...
                    </>
                  ) : usageRole === "supporter" ? (
                    "Complete Setup & Go to Dashboard"
                  ) : (
                    "Continue to Dashboard"
                  )}
                </Button>
              </div>
            </form>
          )}
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
