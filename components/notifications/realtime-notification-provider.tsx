"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "@/lib/hooks/use-user-profile"
import { acceptPartnerInvitationByIdAction } from "@/app/actions/partner"
import {
  UserPlus,
  Check,
  ExternalLink,
  X,
  Loader2,
  CheckCircle2,
  HeartHandshake,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { playNotificationSound } from "@/lib/notifications/sound"

interface ToastNotification {
  id: string
  title: string
  body: string
  invitationId?: string
  inviterUsername?: string
  inviterDisplayName?: string
  status?: "pending" | "accepting" | "accepted" | "error"
  errorMessage?: string
}

export function RealtimeNotificationProvider({
  children,
}: {
  children?: React.ReactNode
}) {
  const router = useRouter()
  const { userId } = useUserProfile()
  const [toast, setToast] = React.useState<ToastNotification | null>(null)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  const showToast = React.useCallback((item: ToastNotification) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    setToast(item)

    // Automatically dismiss after 12 seconds if not interacted with
    timerRef.current = setTimeout(() => {
      setToast(null)
    }, 12000)
  }, [])

  const dismissToast = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToast(null)
  }, [])

  // Handle one-click accept directly from the toast
  const handleAcceptFromToast = React.useCallback(
    async (invitationId: string) => {
      if (!invitationId) {
        router.push("/settings/partner")
        dismissToast()
        return
      }

      setToast((prev) => (prev ? { ...prev, status: "accepting" } : null))

      try {
        const res = await acceptPartnerInvitationByIdAction(invitationId)
        if (res.ok) {
          setToast((prev) =>
            prev
              ? {
                  ...prev,
                  status: "accepted",
                  body: `You are now connected with @${prev.inviterUsername || "partner"}!`,
                }
              : null
          )

          // Dispatch sync events to refresh all components instantly
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("seijun:partner-state-changed"))
            window.dispatchEvent(new CustomEvent("seijun:notification-update"))
          }

          // Auto-hide success state after 3.5 seconds
          timerRef.current = setTimeout(() => {
            setToast(null)
          }, 3500)
        } else {
          setToast((prev) =>
            prev
              ? {
                  ...prev,
                  status: "error",
                  errorMessage: res.error || "Failed to accept.",
                }
              : null
          )
        }
      } catch {
        setToast((prev) =>
          prev
            ? {
                ...prev,
                status: "error",
                errorMessage: "Network error accepting invitation.",
              }
            : null
        )
      }
    },
    [router, dismissToast]
  )

  // Supabase Realtime channel subscription + Service Worker message listener
  React.useEffect(() => {
    if (!userId || typeof window === "undefined") return

    const supabase = createClient()
    const channelName = `seijun-realtime-user-${userId}`

    // 1. Supabase Realtime Subscription
    const channel = supabase
      .channel(channelName)
      // Listen to new notification_events for current user
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_events",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRow = payload.new as {
            id?: string
            type?: string
            title?: string
            body?: string
            metadata?: { invitationId?: string; inviterUsername?: string; inviterDisplayName?: string }
          }

          // Trigger header badge refresh
          window.dispatchEvent(new CustomEvent("seijun:notification-update"))

          // If partner invitation, also trigger partner card refresh and show in-app toast
          if (newRow.type === "partner_invitation") {
            window.dispatchEvent(new CustomEvent("seijun:partner-state-changed"))

            showToast({
              id: newRow.id || `notif-${Date.now()}`,
              title: newRow.title || "Partner Invitation",
              body: newRow.body || "You received a new partner invitation.",
              invitationId: newRow.metadata?.invitationId,
              inviterUsername: newRow.metadata?.inviterUsername,
              inviterDisplayName: newRow.metadata?.inviterDisplayName,
              status: "pending",
            })
            void playNotificationSound()
          } else {
            showToast({
              id: newRow.id || `notif-${Date.now()}`,
              title: newRow.title || "Notification",
              body: newRow.body || "You have a new update.",
              status: "pending",
            })
            void playNotificationSound()
          }
        }
      )
      // Listen to partner_invitations changes for this invitee
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "partner_invitations",
          filter: `invitee_user_id=eq.${userId}`,
        },
        (payload) => {
          // Notify any partner connection UI to sync state
          window.dispatchEvent(new CustomEvent("seijun:partner-state-changed"))
          window.dispatchEvent(new CustomEvent("seijun:notification-update"))

          if (payload.eventType === "INSERT") {
            const newInvite = payload.new as { id?: string; inviter_user_id?: string }
            showToast({
              id: `invite-${newInvite.id || Date.now()}`,
              title: "Partner Invitation",
              body: "Someone sent you a partner invitation.",
              invitationId: newInvite.id,
              status: "pending",
            })
            void playNotificationSound()
          }
        }
      )
      .subscribe()

    // 2. Service Worker PostMessage Relay Listener (if push arrives while tab is open)
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "SEIJUN_PUSH_RECEIVED") {
        window.dispatchEvent(new CustomEvent("seijun:notification-update"))
        window.dispatchEvent(new CustomEvent("seijun:partner-state-changed"))

        const payload = event.data.payload || {}
        const data = payload.data || {}
        if (data.type === "partner_invitation") {
          showToast({
            id: `sw-push-${Date.now()}`,
            title: payload.title || "Partner Invitation",
            body: payload.body || "You received a partner invitation.",
            invitationId: data.invitationId,
            inviterUsername: data.inviterUsername,
            inviterDisplayName: data.inviterDisplayName,
            status: "pending",
          })
        } else {
          showToast({
            id: `sw-push-${Date.now()}`,
            title: payload.title || "Notification",
            body: payload.body || "You have a new update.",
            status: "pending",
          })
        }
        void playNotificationSound()
      }
    }

    const handlePlaySoundEvent = () => {
      void playNotificationSound()
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage)
    }
    window.addEventListener("seijun:play-notification-sound", handlePlaySoundEvent)

    return () => {
      void supabase.removeChannel(channel)
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage)
      }
      window.removeEventListener("seijun:play-notification-sound", handlePlaySoundEvent)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [userId, showToast])

  return (
    <>
      {children}

      {/* Floating In-App Realtime Toast Banner */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] rounded-2xl border border-primary/25 bg-card/95 backdrop-blur-md p-4 shadow-xl transition-all animate-in fade-in-50 slide-in-from-top-3 duration-200"
        >
          <div className="flex items-start gap-3">
            {/* Visual Icon */}
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                toast.status === "accepted"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-lavender text-primary border-lavender-border/80"
              }`}
            >
              {toast.status === "accepted" ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <HeartHandshake className="size-5 animate-pulse" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-semibold text-foreground tracking-tight">
                  {toast.status === "accepted" ? "Partner Connected!" : toast.title}
                </h4>
                <button
                  type="button"
                  onClick={dismissToast}
                  aria-label="Dismiss"
                  className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {toast.body}
              </p>

              {toast.errorMessage && (
                <p className="text-[11px] text-destructive font-medium pt-0.5">
                  {toast.errorMessage}
                </p>
              )}

              {/* Action Buttons */}
              {toast.status !== "accepted" && (
                <div className="flex items-center gap-2 pt-2">
                  {toast.invitationId && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={toast.status === "accepting"}
                      onClick={() => handleAcceptFromToast(toast.invitationId!)}
                      className="h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 shadow-xs cursor-pointer"
                    >
                      {toast.status === "accepting" ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          <span>Accepting...</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-3.5" />
                          <span>Accept</span>
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      router.push("/settings/partner")
                      dismissToast()
                    }}
                    className="h-8 px-3 text-xs rounded-xl border-border/70 text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                  >
                    <span>View</span>
                    <ExternalLink className="size-3 opacity-60" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
