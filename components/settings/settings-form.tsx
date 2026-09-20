"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { LogoutButton } from "@/components/auth/logout-button"
import { updateSettingsAction, uploadAvatarAction } from "@/app/actions/settings"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { AvatarPicker } from "@/components/profile/avatar-picker"
import { cn } from "@/lib/utils"
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
  SunMoon,
  HeartHandshake,
} from "lucide-react"

export interface ProfileSettingsData {
  displayName: string
  avatarUrl?: string | null
  sex?: "male" | "female" | "prefer_not_to_say" | null
  usageRole?: "cycle_tracker" | "supporter" | "both" | null
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
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d)
  } catch {
    return isoString
  }
}

export function SettingsForm({ initialData }: SettingsFormProps) {
  const [displayName, setDisplayName] = React.useState(initialData.displayName || "")
  const [avatarUrl, setAvatarUrl] = React.useState<string>(
    initialData.avatarUrl && !initialData.avatarUrl.startsWith("preset:") ? initialData.avatarUrl : ""
  )
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [sex, setSex] = React.useState<string>(initialData.sex || "prefer_not_to_say")
  const [isEditingSex, setIsEditingSex] = React.useState<boolean>(!initialData.sex)
  const [typicalCycleLength, setTypicalCycleLength] = React.useState<string>(
    initialData.typicalCycleLength ? String(initialData.typicalCycleLength) : "28"
  )
  const [lastPeriodStart, setLastPeriodStart] = React.useState<string>(
    initialData.lastPeriodStart || ""
  )

  const [isPending, setIsPending] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Ephemeral Pop-up Modal Notification (disappears automatically after 0.5s)
  const [modalNotif, setModalNotif] = React.useState<{
    title: string
    message: string
  } | null>(null)
  const [isModalExiting, setIsModalExiting] = React.useState(false)
  const modalTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const modalExitTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const showModalNotification = React.useCallback((title: string, message: string, durationMs: number = 1000) => {
    if (modalTimerRef.current) clearTimeout(modalTimerRef.current)
    if (modalExitTimerRef.current) clearTimeout(modalExitTimerRef.current)

    setErrorMessage(null)
    setIsModalExiting(false)
    setModalNotif({ title, message })

    // Automatically disappear after specified duration (defaults to 1s / 1000ms)
    modalTimerRef.current = setTimeout(() => {
      setIsModalExiting(true)
      modalExitTimerRef.current = setTimeout(() => {
        setModalNotif(null)
        setIsModalExiting(false)
      }, 150)
    }, durationMs)
  }, [])

  React.useEffect(() => {
    return () => {
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current)
      if (modalExitTimerRef.current) clearTimeout(modalExitTimerRef.current)
    }
  }, [])

  const todayStr = React.useMemo(() => new Date().toISOString().split("T")[0], [])

  const handleAvatarChange = async (newVal: string, file?: File | null) => {
    setErrorMessage(null)
    setAvatarUrl(newVal)

    // Photo Removal: Revert to user initials
    if (!newVal) {
      setAvatarFile(null)
      try {
        const uploadFd = new FormData()
        uploadFd.set("remove", "true")
        const uploadRes = await uploadAvatarAction(uploadFd)
        if (uploadRes.success) {
          showModalNotification("Profile Photo Removed", "Showing your initials.")
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("seijun:profile-updated", {
                detail: { avatarUrl: null },
              })
            )
          }
        } else if (uploadRes.error) {
          setErrorMessage(uploadRes.error)
        }
      } catch {
        setErrorMessage("Failed to remove profile photo.")
      }
      return
    }

    if (file) {
      setAvatarFile(file)
      try {
        const uploadFd = new FormData()
        uploadFd.set("file", file)
        uploadFd.set("dataUrl", newVal)
        const uploadRes = await uploadAvatarAction(uploadFd)
        if (uploadRes.success && uploadRes.avatarUrl) {
          setAvatarUrl(uploadRes.avatarUrl)
          setAvatarFile(null)
          showModalNotification("Profile Image Updated", "Profile image updated.")
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("seijun:profile-updated", {
                detail: { avatarUrl: uploadRes.avatarUrl },
              })
            )
          }
        } else if (uploadRes.error) {
          setErrorMessage(uploadRes.error)
        }
      } catch {
        setErrorMessage("Failed to save profile image.")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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

    const isSupporter = initialData.usageRole === "supporter"

    // 2. Client validation: Cycle Length (21–45 days)
    let cycleLengthNum: number | null = null
    if (!isSupporter || typicalCycleLength.trim()) {
      if (!typicalCycleLength.trim() && !isSupporter) {
        setErrorMessage("Please enter your typical cycle length.")
        return
      }
      if (typicalCycleLength.trim()) {
        if (!/^\d+$/.test(typicalCycleLength.trim())) {
          setErrorMessage("Typical cycle length must be a whole number of days.")
          return
        }
        const parsed = parseInt(typicalCycleLength.trim(), 10)
        if (isNaN(parsed) || parsed < 21 || parsed > 45) {
          setErrorMessage("Typical cycle length must be between 21 and 45 days.")
          return
        }
        cycleLengthNum = parsed
      }
    }

    // 3. Client validation: Last Period Start Date
    if (!isSupporter && !lastPeriodStart) {
      setErrorMessage("Please select when your last period started.")
      return
    }
    if (lastPeriodStart && lastPeriodStart > todayStr) {
      setErrorMessage("Last period start date cannot be in the future.")
      return
    }

    setIsPending(true)

    try {
      let finalAvatar = avatarUrl
      if (avatarFile) {
        const uploadFd = new FormData()
        uploadFd.set("file", avatarFile)
        uploadFd.set("dataUrl", avatarUrl)
        const uploadRes = await uploadAvatarAction(uploadFd)
        if (uploadRes.success && uploadRes.avatarUrl) {
          finalAvatar = uploadRes.avatarUrl
          setAvatarUrl(uploadRes.avatarUrl)
          setAvatarFile(null)
        }
      }

      const formData = new FormData()
      formData.set("displayName", trimmedName)
      formData.set("avatarUrl", finalAvatar)
      formData.set("sex", sex)
      if (cycleLengthNum !== null) {
        formData.set("typicalCycleLength", String(cycleLengthNum))
      }
      if (lastPeriodStart) {
        formData.set("lastPeriodStart", lastPeriodStart)
      }

      const result = await updateSettingsAction(null, formData)

      if (!result.success) {
        setErrorMessage(result.error ?? "Failed to save settings. Please try again.")
      } else {
        showModalNotification("Settings Saved", result.message ?? "Your settings have been saved.", 1000)
        // Keep updated display name formatted
        setDisplayName(trimmedName)
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("seijun:profile-updated", {
              detail: { avatarUrl: finalAvatar, displayName: trimmedName },
            })
          )
        }
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

      {/* Pop-up Modal Notification (Disappears automatically after 0.5s) */}
      {modalNotif && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none transition-all duration-150",
            isModalExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
          )}
        >
          {/* Subtle backdrop */}
          <div
            className={cn(
              "fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[2px] transition-opacity duration-150 pointer-events-auto",
              isModalExiting ? "opacity-0" : "opacity-100"
            )}
            onClick={() => {
              setModalNotif(null)
              setIsModalExiting(false)
            }}
          />

          {/* Centered Modal Card */}
          <div
            className={cn(
              "relative z-10 flex flex-col items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-card border border-emerald-500/30 text-card-foreground shadow-2xl max-w-xs w-full text-center pointer-events-auto backdrop-blur-md transition-all duration-150",
              isModalExiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-500/20">
              <CheckCircle2 className="size-6 stroke-[2.2]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {modalNotif.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {modalNotif.message}
              </p>
            </div>
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
        <CardContent className="space-y-6">
          {/* Avatar Picker Widget */}
          <AvatarPicker
            value={avatarUrl}
            displayName={displayName || "User"}
            onChange={handleAvatarChange}
            disabled={isPending}
            inputName="avatarUrl"
          />

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

          {/* Sex Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Sex</Label>
              {isEditingSex && (
                <button
                  type="button"
                  onClick={() => setIsEditingSex(false)}
                  disabled={isPending}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            {!isEditingSex ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border/70 bg-background/50 shadow-xs">
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  {sex === "male"
                    ? "Male"
                    : sex === "female"
                    ? "Female"
                    : "Prefer not to say"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingSex(true)}
                  disabled={isPending}
                  className="h-7 px-2.5 text-xs font-medium text-primary hover:text-primary hover:bg-lavender/50 rounded-lg cursor-pointer"
                >
                  Change
                </Button>
              </div>
            ) : (
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
                  const isSelected = sex === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setSex(option.value)
                        setIsEditingSex(false)
                      }}
                      disabled={isPending}
                      className={cn(
                        "inline-flex items-center justify-center px-1.5 py-2 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-all duration-150 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95 text-center",
                        isSelected
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
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Descriptive profile information. Never used to restrict features or permissions.
            </p>
          </div>

          {/* Your Role */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-sm font-medium">Your Role</Label>
            <div className="flex items-center gap-2.5">
              <Badge variant="lavender" className="px-3 py-1 text-xs font-medium gap-1.5">
                <Sparkles className="size-3 text-primary" />
                {initialData.usageRole === "supporter"
                  ? "Partner & Supporter"
                  : initialData.usageRole === "both"
                  ? "Cycle Tracker & Supporter"
                  : "Cycle Tracker"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {initialData.usageRole === "supporter"
                ? "You support a partner or friend's cycle. When 1:1 Partner Connections launch, you'll be able to link accounts and view their shared menstrual data."
                : initialData.usageRole === "both"
                ? "You track your own cycle and symptoms while also being ready to connect and support a partner or friend."
                : "You track your own menstrual cycle, log personal symptoms and daily notes, and receive tailored period predictions."}
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
          {initialData.usageRole === "supporter" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-lavender/40 p-3.5 border border-lavender-border/70 text-xs text-muted-foreground leading-relaxed">
              <HeartHandshake className="size-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Supporter account:</strong> Personal cycle tracking is optional. You may enter cycle values below if you also wish to track personal cycle data.
              </span>
            </div>
          )}
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

      {/* 3. Appearance & Theme Section */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <SunMoon className="size-5" />
            </div>
            <div>
              <CardTitle>Appearance & Theme</CardTitle>
              <CardDescription>
                Personalize how Seijun looks on this device
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      {/* 4. Account & Security Section */}
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
