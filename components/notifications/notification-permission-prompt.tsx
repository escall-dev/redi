"use client"

import * as React from "react"
import { BellRing, X, Loader2, Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  isWebPushSupported,
  getNotificationPermission,
  registerAndPersistWebPush,
} from "@/lib/push/subscription-manager"
import type { ProfileUsageRole } from "@/lib/supabase/types"

interface NotificationPermissionPromptProps {
  usageRole?: ProfileUsageRole | null
  className?: string
  onStatusChange?: () => void
}

const DISMISSED_KEY = "seijun_notif_prompt_dismissed"

export function NotificationPermissionPrompt({
  usageRole,
  className,
  onStatusChange,
}: NotificationPermissionPromptProps) {
  const [visible, setVisible] = React.useState<boolean>(false)
  const [busy, setBusy] = React.useState<boolean>(false)
  const [success, setSuccess] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Only client-side check
    if (typeof window === "undefined") return

    // Supporters do not track personal cycles
    if (usageRole === "supporter") {
      setVisible(false)
      return
    }

    // Check browser support
    if (!isWebPushSupported()) {
      setVisible(false)
      return
    }

    // Check permission state
    const permission = getNotificationPermission()
    // If already granted or explicitly denied, do not show prompt
    if (permission !== "default") {
      setVisible(false)
      return
    }

    // Check local storage dismissal
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (dismissed) {
        setVisible(false)
        return
      }
    } catch {
      // Storage access error
    }

    setVisible(true)
  }, [usageRole])

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString())
    } catch {
      // Ignore
    }
    setVisible(false)
  }

  const handleEnable = async () => {
    setBusy(true)
    try {
      const result = await registerAndPersistWebPush({
        deviceName: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : undefined,
      })

      if (result.ok) {
        setSuccess(true)
        onStatusChange?.()
        setTimeout(() => {
          setVisible(false)
        }, 2500)
      } else {
        // If user denied in native dialog, respect it
        const currentPerm = getNotificationPermission()
        if (currentPerm === "denied") {
          setVisible(false)
        }
      }
    } catch {
      // Ignore
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Notification Permission"
      className={`relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-r from-primary/[0.06] via-lavender/30 to-background p-4 sm:p-5 shadow-xs transition-all animate-in fade-in-50 slide-in-from-top-2 ${
        className ?? ""
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs mt-0.5">
            {success ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <BellRing className="size-5" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Stay updated with your cycle
              </h3>
              <Badge variant="lavender" className="text-[10px] px-2 py-0 font-normal">
                Smart Reminders
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              {success
                ? "Reminders enabled! You'll receive timely updates before your period and fertile window."
                : "Seijun can remind you before your estimated period starts and when your fertile window approaches."}
            </p>
          </div>
        </div>

        {/* Buttons */}
        {!success && (
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={busy}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-3"
            >
              Not now
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleEnable}
              disabled={busy}
              className="text-xs font-semibold h-8 px-3.5 gap-1.5 shadow-xs"
            >
              {busy ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>Enable reminders</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {!success && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="absolute top-2 right-2 p-1 text-muted-foreground/60 hover:text-muted-foreground rounded-lg transition-colors"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
