"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, BellRing, BellOff, CheckCircle2, AlertCircle, Loader2, Send, ShieldAlert, Copy, Check } from "lucide-react"
import {
  isWebPushSupported,
  getNotificationPermission,
  registerAndPersistWebPush,
  unsubscribeAndRemoveWebPush,
  isBraveBrowser,
} from "@/lib/push/subscription-manager"
import { sendCurrentAccountTestPushAction } from "@/app/actions/push-test"
import type { PushDeliverySummary } from "@/lib/push/types"

export function PushTestCard() {
  const [isSupported, setIsSupported] = React.useState<boolean | null>(null)
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">("default")
  const [isSubscribed, setIsSubscribed] = React.useState<boolean>(false)
  const [isBusy, setIsBusy] = React.useState<boolean>(false)
  const [actionMessage, setActionMessage] = React.useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [deliveryResult, setDeliveryResult] = React.useState<PushDeliverySummary | null>(null)
  const [isBrave, setIsBrave] = React.useState<boolean>(false)
  const [copiedLink, setCopiedLink] = React.useState<boolean>(false)

  // Inspect current client state safely after hydration
  const refreshStatus = React.useCallback(async () => {
    if (typeof window === "undefined") return

    const supported = isWebPushSupported()
    const currentPerm = supported ? getNotificationPermission() : "unsupported"
    let subscribed = false

    if (supported && "serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration?.pushManager?.getSubscription()
        subscribed = Boolean(subscription)
      } catch {
        subscribed = false
      }
    }

    const brave = await isBraveBrowser()

    setIsSupported(supported)
    setPermission(currentPerm)
    setIsSubscribed(subscribed)
    setIsBrave(brave)
  }, [])

  React.useEffect(() => {
    let isMounted = true

    const checkStatus = async () => {
      if (typeof window === "undefined") return

      const supported = isWebPushSupported()
      const currentPerm = supported ? getNotificationPermission() : "unsupported"
      let subscribed = false

      if (supported && "serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration?.pushManager?.getSubscription()
          subscribed = Boolean(subscription)
        } catch {
          subscribed = false
        }
      }

      const brave = await isBraveBrowser()

      if (isMounted) {
        setIsSupported(supported)
        setPermission(currentPerm)
        setIsSubscribed(subscribed)
        setIsBrave(brave)
      }
    }

    void checkStatus()

    return () => {
      isMounted = false
    }
  }, [])

  // Explicit user-triggered subscription enrollment
  const handleEnablePush = async () => {
    setIsBusy(true)
    setActionMessage(null)
    setDeliveryResult(null)

    try {
      const result = await registerAndPersistWebPush({
        deviceName: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : undefined,
      })

      if (result.ok) {
        setActionMessage({
          type: "success",
          text: "Push notifications successfully enabled and persisted on this device.",
        })
        await refreshStatus()
      } else {
        setActionMessage({
          type: "error",
          text: result.message || "Failed to enable push notifications.",
        })
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An unexpected error occurred.",
      })
    } finally {
      setIsBusy(false)
    }
  }

  // Explicit user-triggered unsubscription
  const handleDisablePush = async () => {
    setIsBusy(true)
    setActionMessage(null)
    setDeliveryResult(null)

    try {
      const ok = await unsubscribeAndRemoveWebPush()
      if (ok) {
        setActionMessage({
          type: "info",
          text: "Push notifications disabled and removed for this device.",
        })
        await refreshStatus()
      } else {
        setActionMessage({
          type: "error",
          text: "Failed to unsubscribe device.",
        })
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to disable notifications.",
      })
    } finally {
      setIsBusy(false)
    }
  }

  // Explicit user-triggered test notification (Test A)
  const handleSendTestPush = async () => {
    setIsBusy(true)
    setActionMessage(null)
    setDeliveryResult(null)

    try {
      const summary = await sendCurrentAccountTestPushAction()
      setDeliveryResult(summary)

      if (summary.ok) {
        setActionMessage({
          type: "success",
          text: `Test notification sent! Delivered to ${summary.delivered} of ${summary.attempted} device(s).`,
        })
      } else {
        setActionMessage({
          type: "error",
          text: summary.error || "Failed to send test push notification.",
        })
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unexpected error during test send.",
      })
    } finally {
      setIsBusy(false)
      await refreshStatus()
    }
  }

  return (
    <Card className="overflow-hidden border-primary/20 bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <Bell className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Push Notifications</CardTitle>
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px] px-1.5 py-0 font-normal">
                  Phase 17.9 Test
                </Badge>
              </div>
              <CardDescription>
                Device push subscription status and end-to-end delivery test
              </CardDescription>
            </div>
          </div>

          <div>
            {isSupported === false ? (
              <Badge variant="secondary" className="text-xs">Unsupported</Badge>
            ) : isSubscribed ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs font-normal">
                <CheckCircle2 className="size-3" /> Subscribed
              </Badge>
            ) : permission === "denied" ? (
              <Badge variant="destructive" className="gap-1 text-xs font-normal">
                <AlertCircle className="size-3" /> Blocked
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs font-normal">
                Not Subscribed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Device Status Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
            <span className="text-muted-foreground block mb-0.5">Browser Support:</span>
            <span className="font-medium text-foreground">
              {isSupported === null ? "Checking..." : isSupported ? "Supported" : "Not Supported"}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
            <span className="text-muted-foreground block mb-0.5">Permission:</span>
            <span className="font-medium text-foreground capitalize">
              {permission}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
            <span className="text-muted-foreground block mb-0.5">This Device:</span>
            <span className="font-medium text-foreground">
              {isSubscribed ? "Registered" : "Unregistered"}
            </span>
          </div>
        </div>

        {/* Brave Browser Setup Helper */}
        {isBrave && !isSubscribed && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-300">
              <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Brave Browser Push Service Configuration</span>
            </div>
            <p className="leading-relaxed text-[11px] text-muted-foreground">
              Brave blocks Google Push Messaging by default for privacy. To enable push notifications on this device:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground pl-1">
              <li>
                Open Brave Settings and go to <strong>Privacy and security</strong> (or navigate to <code className="bg-secondary/70 px-1 py-0.5 rounded text-foreground font-mono">brave://settings/privacy</code>)
              </li>
              <li>
                Turn ON <strong>&quot;Use Google services for push messaging&quot;</strong>
              </li>
              <li>
                <strong>Relaunch Brave</strong>, reload this page, and click &quot;Enable Push Notifications&quot;
              </li>
            </ol>
            <div className="pt-1 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1.5 rounded-lg border-amber-500/30 bg-background/50 hover:bg-background"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText("brave://settings/privacy")
                    setCopiedLink(true)
                    setTimeout(() => setCopiedLink(false), 2500)
                  }
                }}
              >
                {copiedLink ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                {copiedLink ? "Copied 'brave://settings/privacy' to clipboard" : "Copy 'brave://settings/privacy'"}
              </Button>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {actionMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              actionMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : actionMessage.type === "error"
                ? "bg-destructive/10 border-destructive/30 text-destructive dark:text-destructive"
                : "bg-secondary/70 border-border text-foreground"
            }`}
          >
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Structured Delivery Summary */}
        {deliveryResult && (
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-medium text-foreground">
              <span>Delivery Results (Test A — Current Account)</span>
              <span className={deliveryResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                {deliveryResult.ok ? "SUCCESS" : "FAILED"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-border/40">
              <div className="p-1.5 rounded-md bg-card border border-border/40">
                <div className="text-muted-foreground text-[10px]">Attempted</div>
                <div className="font-semibold text-foreground text-sm">{deliveryResult.attempted}</div>
              </div>
              <div className="p-1.5 rounded-md bg-card border border-border/40">
                <div className="text-muted-foreground text-[10px]">Delivered</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">{deliveryResult.delivered}</div>
              </div>
              <div className="p-1.5 rounded-md bg-card border border-border/40">
                <div className="text-muted-foreground text-[10px]">Expired</div>
                <div className="font-semibold text-amber-600 dark:text-amber-400 text-sm">{deliveryResult.expired}</div>
              </div>
              <div className="p-1.5 rounded-md bg-card border border-border/40">
                <div className="text-muted-foreground text-[10px]">Failed</div>
                <div className="font-semibold text-destructive text-sm">{deliveryResult.failed}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          {!isSubscribed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy || isSupported === false}
              onClick={handleEnablePush}
              className="gap-1.5 rounded-lg"
            >
              {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : <BellRing className="size-3.5 text-primary" />}
              Enable Push Notifications
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={handleDisablePush}
              className="gap-1.5 text-muted-foreground hover:text-destructive rounded-lg text-xs"
            >
              <BellOff className="size-3.5" />
              Disable on this device
            </Button>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          disabled={isBusy || !isSubscribed}
          onClick={handleSendTestPush}
          className="gap-1.5 rounded-lg font-medium"
        >
          {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          Send Test Notification
        </Button>
      </CardFooter>
    </Card>
  )
}
