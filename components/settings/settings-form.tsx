"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { LogoutButton } from "@/components/auth/logout-button"
import { updateSettingsAction } from "@/app/actions/settings"
import {
  User,
  CalendarHeart,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Mail,
  Calendar,
} from "lucide-react"

export interface ProfileSettingsData {
  displayName: string
  typicalCycleLength: number
  lastPeriodStart: string
  email: string
  createdAt: string
}

interface SettingsFormProps {
  initialData: ProfileSettingsData
}

function formatDateDisplay(isoString: string): string {
  if (!isoString) return "N/A"
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  } catch {
    return isoString
  }
}

export function SettingsForm({ initialData }: SettingsFormProps) {
  const [displayName, setDisplayName] = React.useState(initialData.displayName || "")
  const [typicalCycleLength, setTypicalCycleLength] = React.useState<string>(
    initialData.typicalCycleLength ? String(initialData.typicalCycleLength) : "28"
  )
  const [lastPeriodStart, setLastPeriodStart] = React.useState<string>(
    initialData.lastPeriodStart || ""
  )

  const [isPending, setIsPending] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const todayStr = React.useMemo(() => new Date().toISOString().split("T")[0], [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    // 1. Client validation: Display Name
    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setErrorMessage("Please enter your display name.")
      return
    }
    if (trimmedName.length < 2) {
      setErrorMessage("Display name must be at least 2 characters long.")
      return
    }
    if (trimmedName.length > 50) {
      setErrorMessage("Display name must be 50 characters or fewer.")
      return
    }
    if (/<[^>]*>/g.test(trimmedName)) {
      setErrorMessage("Display name contains invalid characters.")
      return
    }

    // 2. Client validation: Cycle Length (21–45 days)
    if (!typicalCycleLength.trim()) {
      setErrorMessage("Please enter your typical cycle length.")
      return
    }
    if (!/^\d+$/.test(typicalCycleLength.trim())) {
      setErrorMessage("Typical cycle length must be a whole number of days.")
      return
    }
    const cycleLengthNum = parseInt(typicalCycleLength.trim(), 10)
    if (isNaN(cycleLengthNum) || cycleLengthNum < 21 || cycleLengthNum > 45) {
      setErrorMessage("Typical cycle length must be between 21 and 45 days.")
      return
    }

    // 3. Client validation: Last Period Start Date
    if (!lastPeriodStart) {
      setErrorMessage("Please select when your last period started.")
      return
    }
    if (lastPeriodStart > todayStr) {
      setErrorMessage("Last period start date cannot be in the future.")
      return
    }

    setIsPending(true)

    try {
      const formData = new FormData()
      formData.set("displayName", trimmedName)
      formData.set("typicalCycleLength", String(cycleLengthNum))
      formData.set("lastPeriodStart", lastPeriodStart)

      const result = await updateSettingsAction(null, formData)

      if (!result.success) {
        setErrorMessage(result.error ?? "Failed to save settings. Please try again.")
      } else {
        setSuccessMessage(result.message ?? "Your settings have been saved.")
        // Keep updated display name formatted
        setDisplayName(trimmedName)
      }
    } catch {
      setErrorMessage("An unexpected error occurred while saving your settings.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Feedback Messages */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive shadow-xs animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Unable to save changes</p>
            <p className="leading-relaxed opacity-90">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div className="space-y-1">
            <p className="font-medium">Settings Updated</p>
            <p className="leading-relaxed opacity-90">{successMessage}</p>
          </div>
        </div>
      )}

      {/* 1. Profile Section */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <User className="size-5" />
            </div>
            <div>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                How you appear throughout your personal Seijun space
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="displayName" className="text-sm font-medium">
                Display Name <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {displayName.length}/50
              </span>
            </div>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or preferred nickname"
              maxLength={50}
              disabled={isPending}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Used for your greeting on the dashboard and journal entries.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Cycle Preferences Section */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <CalendarHeart className="size-5" />
            </div>
            <div>
              <CardTitle>Cycle Preferences</CardTitle>
              <CardDescription>
                Baseline metrics to calculate your cycle windows and projections
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Informational Disclaimer Badge */}
          <div className="flex items-start gap-2.5 rounded-xl bg-secondary/60 p-3.5 border border-border/50 text-xs text-muted-foreground leading-relaxed">
            <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
            <span>
              Tracking preferences are used solely to personalize your cycle estimates and journal. They are not medical diagnoses or healthcare advice.
            </span>
          </div>

          {/* Typical Cycle Length */}
          <div className="space-y-1.5">
            <Label htmlFor="typicalCycleLength" className="text-sm font-medium">
              Typical Cycle Length (Days) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="typicalCycleLength"
              name="typicalCycleLength"
              type="number"
              min={21}
              max={45}
              step={1}
              required
              value={typicalCycleLength}
              onChange={(e) => setTypicalCycleLength(e.target.value)}
              placeholder="e.g. 28"
              disabled={isPending}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Standard cycles typically range from 21 to 45 days. This provides an initial baseline until sufficient logged cycles are available.
            </p>
          </div>

          {/* Last Period Start Date */}
          <div className="space-y-1.5">
            <Label htmlFor="lastPeriodStart" className="text-sm font-medium">
              Last Period Start Date <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              id="lastPeriodStart"
              name="lastPeriodStart"
              value={lastPeriodStart}
              onChange={setLastPeriodStart}
              maxDate={todayStr}
              placeholder="Select start date"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              The first day of bleeding in your most recent cycle. Future dates cannot be selected.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Account & Security Section */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <CardTitle>Account & Session</CardTitle>
              <CardDescription>
                Signed-in credentials and current device session
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3.5 rounded-xl bg-secondary/50 border border-border/50 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              <span>Email Address</span>
            </div>
            <span className="font-medium text-foreground">{initialData.email || "Not available"}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3.5 rounded-xl bg-secondary/50 border border-border/50 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4 shrink-0" />
              <span>Member Since</span>
            </div>
            <span className="font-medium text-foreground">{formatDateDisplay(initialData.createdAt)}</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Sign out of Seijun on this device.
          </p>
          <LogoutButton />
        </CardFooter>
      </Card>

      {/* 4. Danger Zone Section */}
      <Card className="border-destructive/30 bg-destructive/[0.02] overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px] px-1.5 py-0 font-normal">
                  Data Policy
                </Badge>
              </div>
              <CardDescription>
                Permanent account deletion and authentication management
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-destructive/20 bg-card p-4 space-y-2 text-sm">
            <p className="font-medium text-foreground">
              Account Deletion & Data Purge
            </p>
            <p className="text-muted-foreground leading-relaxed text-xs">
              To protect your privacy and ensure cryptographic guarantees, complete account deletion permanently purges all authentication credentials, cycle history, symptoms, and daily logs. In compliance with security standards, client apps cannot hold administrative database privileges. If you wish to delete your account completely, please submit a deletion request to support or contact your administrator.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Action Bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-3.5 shadow-redi-md">
        <Button
          type="submit"
          disabled={isPending}
          className="min-h-[44px] min-w-[140px] px-5 rounded-xl font-medium shadow-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Saving Changes...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  )
}
