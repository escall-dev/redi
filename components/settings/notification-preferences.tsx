"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  BellRing,
  User,
  HeartHandshake,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  CalendarHeart,
  FileText,
  Activity,
  UserCheck,
  Info,
} from "lucide-react"
import {
  type NotificationCategory,
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_GROUPS,
} from "@/lib/notifications/types"
import {
  getNotificationPreferencesAction,
  updateNotificationPreferenceAction,
} from "@/app/actions/notification-preferences"
import { isWebPushSupported, getNotificationPermission } from "@/lib/push/subscription-manager"
import type { ProfileUsageRole } from "@/lib/supabase/types"

interface NotificationPreferencesProps {
  initialPreferences?: NotificationPreferences
  usageRole?: ProfileUsageRole | null
}

const GROUP_ICONS = {
  personal: User,
  partner: HeartHandshake,
  shared: Users,
  system: ShieldCheck,
}

const CATEGORY_ICONS: Record<NotificationCategory, React.ElementType> = {
  personal_reminders: CalendarHeart,
  personal_updates: Sparkles,
  partner_daily_notes: FileText,
  partner_cycle_updates: CalendarHeart,
  partner_activity: Activity,
  partner_connection: UserCheck,
  shared_reminders: CalendarHeart,
  shared_updates: Sparkles,
  system_notifications: Bell,
  security_notifications: ShieldCheck,
}

export function NotificationPreferencesCard({
  initialPreferences,
  usageRole,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = React.useState<NotificationPreferences>(
    initialPreferences || DEFAULT_NOTIFICATION_PREFERENCES
  )
  const [loading, setLoading] = React.useState<boolean>(!initialPreferences)
  const [pendingCategory, setPendingCategory] = React.useState<NotificationCategory | null>(null)
  const [bannerMessage, setBannerMessage] = React.useState<{
    type: "success" | "error" | "info"
    text: string
  } | null>(null)

  // Device push status telemetry (telemetry-only indicator, strictly decoupled from preferences)
  const [devicePushActive, setDevicePushActive] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    let isMounted = true

    async function loadData() {
      // If initialPreferences was not passed from server, fetch from server action
      if (!initialPreferences) {
        try {
          const res = await getNotificationPreferencesAction()
          if (isMounted && res.ok && res.preferences) {
            setPreferences(res.preferences)
          }
        } catch {
          if (isMounted) {
            setBannerMessage({
              type: "error",
              text: "Could not load saved notification preferences. Using defaults.",
            })
          }
        } finally {
          if (isMounted) setLoading(false)
        }
      }

      // Check device push capability for user awareness
      if (typeof window !== "undefined" && isWebPushSupported()) {
        const perm = getNotificationPermission()
        if (perm === "granted" && "serviceWorker" in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready
            const sub = await reg?.pushManager?.getSubscription()
            if (isMounted) setDevicePushActive(Boolean(sub))
          } catch {
            if (isMounted) setDevicePushActive(false)
          }
        } else {
          if (isMounted) setDevicePushActive(false)
        }
      } else {
        if (isMounted) setDevicePushActive(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [initialPreferences])

  // Clear transient messages after 4 seconds
  React.useEffect(() => {
    if (!bannerMessage) return
    const t = setTimeout(() => setBannerMessage(null), 4000)
    return () => clearTimeout(t)
  }, [bannerMessage])

  // Optimistic preference toggle handler
  const handleToggle = async (category: NotificationCategory) => {
    if (pendingCategory) return // prevent concurrent toggles

    const previousValue = preferences[category]
    const nextValue = !previousValue

    // Optimistically update local UI state
    setPreferences((prev) => ({
      ...prev,
      [category]: nextValue,
    }))
    setPendingCategory(category)
    setBannerMessage(null)

    try {
      const result = await updateNotificationPreferenceAction(category, nextValue)

      if (!result.ok) {
        // Rollback to previous value on failure
        setPreferences((prev) => ({
          ...prev,
          [category]: previousValue,
        }))
        setBannerMessage({
          type: "error",
          text: result.error || "Failed to update notification preference.",
        })
      } else {
        // Sync state if server returned updated preferences
        if (result.preferences) {
          setPreferences(result.preferences)
        }
        setBannerMessage({
          type: "success",
          text: `Updated ${NOTIFICATION_CATEGORIES[category].label} preference.`,
        })
      }
    } catch {
      // Rollback on network exception
      setPreferences((prev) => ({
        ...prev,
        [category]: previousValue,
      }))
      setBannerMessage({
        type: "error",
        text: "Network error occurred while updating preference. Please try again.",
      })
    } finally {
      setPendingCategory(null)
    }
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs" id="notification-preferences">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <BellRing className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Notification Preferences</CardTitle>
                <Badge variant="outline" className="text-[10px] px-2 py-0 font-normal">
                  Category Controls
                </Badge>
              </div>
              <CardDescription>
                Choose which alert categories you want to receive across connected channels.
              </CardDescription>
            </div>
          </div>
        </div>

        {/* Informative banner distinguishing preferences from device subscriptions */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0 text-primary mt-0.5" />
          <div className="space-y-1">
            <p>
              Preferences determine which alerts are generated for your account. They do not alter your
              partner sharing permissions or underlying health records.
            </p>
            {devicePushActive === false && (
              <p className="text-amber-700 dark:text-amber-400 font-medium">
                Note: Web Push is not currently subscribed on this device. You can activate device
                delivery in the Push Notifications section below.
              </p>
            )}
          </div>
        </div>

        {/* Transient feedback banner */}
        {bannerMessage && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-xs font-medium border ${
              bannerMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                : bannerMessage.type === "error"
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-secondary text-foreground border-border"
            }`}
          >
            {bannerMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            <span>Loading notification preferences...</span>
          </div>
        ) : (
          NOTIFICATION_GROUPS.map((group) => {
            const GroupIcon = GROUP_ICONS[group.id] || Bell

            return (
              <div key={group.id} className="space-y-3">
                {/* Group Heading */}
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <GroupIcon className="size-4 text-primary shrink-0" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    {group.title}
                  </h3>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    — {group.description}
                  </span>
                </div>

                {/* Group Categories */}
                <div className="grid gap-2.5">
                  {group.categories.map((categoryKey) => {
                    const config = NOTIFICATION_CATEGORIES[categoryKey]
                    const isEnabled = preferences[categoryKey] ?? true
                    const isPending = pendingCategory === categoryKey
                    const CategoryIcon = CATEGORY_ICONS[categoryKey] || Bell

                    // Role context indicator (non-mutating, informational only)
                    const showSupporterContext =
                      usageRole === "supporter" && group.id === "personal"

                    return (
                      <div
                        key={categoryKey}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border/50 hover:bg-secondary/60 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground border border-border/60 mt-0.5">
                            <CategoryIcon className="size-4 text-foreground/80" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`toggle-${categoryKey}`}
                                className="text-sm font-medium text-foreground cursor-pointer select-none"
                              >
                                {config.label}
                              </label>
                              {showSupporterContext && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground"
                                >
                                  Cycle Tracker
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {config.description}
                            </p>
                          </div>
                        </div>

                        {/* Accessible Switch Toggle Button */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <span
                            className={`text-[11px] font-semibold tracking-wide uppercase ${
                              isEnabled ? "text-primary" : "text-muted-foreground/60"
                            }`}
                            aria-hidden="true"
                          >
                            {isEnabled ? "On" : "Off"}
                          </span>

                          <button
                            id={`toggle-${categoryKey}`}
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            aria-label={`${config.label} notifications`}
                            disabled={isPending}
                            onClick={() => handleToggle(categoryKey)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                handleToggle(categoryKey)
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                              isEnabled ? "bg-primary" : "bg-muted-foreground/30"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                isEnabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            >
                              {isPending && (
                                <Loader2 className="size-3 animate-spin text-muted-foreground" />
                              )}
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
