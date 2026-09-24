"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AvatarPicker } from "@/components/profile/avatar-picker"
import { updateSettingsAction, uploadAvatarAction } from "@/app/actions/settings"
import { cn } from "@/lib/utils"
import {
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react"

export interface ProfileFormData {
  displayName: string
  username?: string | null
  avatarUrl?: string | null
  sex?: "male" | "female" | "prefer_not_to_say" | null
  usageRole?: "cycle_tracker" | "supporter" | "both" | null
  typicalCycleLength?: number
  lastPeriodStart?: string
  email?: string
}

interface ProfileSettingsFormProps {
  initialData: ProfileFormData
}

export function ProfileSettingsForm({ initialData }: ProfileSettingsFormProps) {
  const [displayName, setDisplayName] = React.useState(initialData.displayName || "")
  const [username, setUsername] = React.useState(initialData.username || "")
  const [avatarUrl, setAvatarUrl] = React.useState<string>(
    initialData.avatarUrl && !initialData.avatarUrl.startsWith("preset:") ? initialData.avatarUrl : ""
  )
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [sex, setSex] = React.useState<string>(initialData.sex || "prefer_not_to_say")
  const [isEditingSex, setIsEditingSex] = React.useState<boolean>(!initialData.sex)

  const [isPending, setIsPending] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Ephemeral Pop-up Modal Notification
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

      const trimmedUsername = username.trim().replace(/^@+/, "").toLowerCase()
      if (trimmedUsername) {
        if (!/^[a-z0-9_]{3,30}$/.test(trimmedUsername)) {
          setErrorMessage("Username must be 3 to 30 characters long (letters, numbers, and underscores only).")
          setIsPending(false)
          return
        }
      }

      const formData = new FormData()
      formData.set("displayName", trimmedName)
      formData.set("username", trimmedUsername)
      formData.set("avatarUrl", finalAvatar)
      formData.set("sex", sex)

      const result = await updateSettingsAction(null, formData)

      if (!result.success) {
        setErrorMessage(result.error ?? "Failed to save profile changes. Please try again.")
      } else {
        showModalNotification("Profile Saved", "Your profile details have been saved.", 1000)
        setDisplayName(trimmedName)
        setUsername(trimmedUsername)
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("seijun:profile-updated", {
              detail: { avatarUrl: finalAvatar, displayName: trimmedName, username: trimmedUsername },
            })
          )
        }
      }
    } catch {
      setErrorMessage("An unexpected error occurred while saving your profile.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto pb-12">
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

      {/* Modal Success */}
      {modalNotif && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none transition-all duration-150",
            isModalExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
          )}
        >
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
              <p className="text-xs text-muted-foreground">{modalNotif.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Details Card */}
      <Card className="overflow-hidden border-border/70 shadow-xs">
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
          {/* Avatar Picker */}
          <AvatarPicker
            value={avatarUrl}
            displayName={displayName || "User"}
            onChange={handleAvatarChange}
            disabled={isPending}
            inputName="avatarUrl"
          />

          {/* Display Name */}
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

          {/* Username Handle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="username" className="text-sm font-medium">
                Username <span className="text-xs text-muted-foreground font-normal">(for partner discovery)</span>
              </Label>
              {username && (
                <span className="text-xs text-muted-foreground font-mono">
                  @{username.replace(/^@/, "").toLowerCase()}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium select-none pointer-events-none">
                @
              </span>
              <Input
                id="username"
                name="username"
                type="text"
                value={username.replace(/^@/, "")}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="your_handle"
                maxLength={30}
                disabled={isPending}
                className="h-11 pl-8 rounded-xl font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Unique handle used by your partner to connect with you. Letters, numbers, and underscores only.
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

      {/* Save Button */}
      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-3.5 shadow-redi-md">
        <Button
          type="submit"
          disabled={isPending}
          className="min-h-[44px] min-w-[140px] px-5 rounded-xl font-medium shadow-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Saving Profile...
            </>
          ) : (
            "Save Profile"
          )}
        </Button>
      </div>
    </form>
  )
}
