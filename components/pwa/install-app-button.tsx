"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export interface InstallAppButtonProps {
  className?: string
  label?: string
  forceShow?: boolean
}

function subscribeStandalone(callback: () => void) {
  if (typeof window === "undefined") return () => {}

  const mediaQuery = window.matchMedia("(display-mode: standalone)")
  mediaQuery.addEventListener("change", callback)
  window.addEventListener("appinstalled", callback)

  return () => {
    mediaQuery.removeEventListener("change", callback)
    window.removeEventListener("appinstalled", callback)
  }
}

function getStandaloneSnapshot(): boolean {
  if (typeof window === "undefined") return false

  const isDisplayStandalone = window.matchMedia(
    "(display-mode: standalone)"
  ).matches
  const isNavigatorStandalone =
    "standalone" in window.navigator &&
    Boolean(
      (window.navigator as unknown as { standalone?: boolean }).standalone
    )

  return isDisplayStandalone || isNavigatorStandalone
}

function getStandaloneServerSnapshot(): boolean {
  return false
}

export function InstallAppButton({
  className,
  label = "Download as App",
  forceShow = false,
}: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = React.useState<boolean>(false)

  const isStandalone = React.useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot
  )

  React.useEffect(() => {
    // 1. Query browser/OS to check if PWA is already installed on this device
    if (
      typeof navigator !== "undefined" &&
      "getInstalledRelatedApps" in navigator
    ) {
      ;(
        navigator as unknown as {
          getInstalledRelatedApps: () => Promise<unknown[]>
        }
      )
        .getInstalledRelatedApps()
        .then((apps) => {
          if (Array.isArray(apps) && apps.length > 0) {
            setIsInstalled(true)
          }
        })
        .catch(() => {})
    }

    // 2. Listen for beforeinstallprompt
    // The browser dispatches this event ONLY when the PWA is NOT installed on the device.
    // If the user uninstalls the PWA and returns, this event fires again.
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstalled(false)
    }

    // 3. Listen for appinstalled
    // Fires immediately when the user accepts and the app is installed.
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === "accepted") {
        setIsInstalled(true)
      }
    } catch {
      // Gracefully handle any browser error or cancellation
    } finally {
      setDeferredPrompt(null)
    }
  }

  // Hide the button if:
  // 1. The app is already running in standalone PWA mode
  // 2. The app is already installed on the device (detected via getInstalledRelatedApps or appinstalled)
  // 3. No install prompt is available (browser suppresses it when installed, or unsupported)
  if (!forceShow && (isStandalone || isInstalled || !deferredPrompt)) {
    return null
  }

  return (
    <div className="w-full pt-1.5 flex flex-col items-center">
      <Button
        type="button"
        variant="outline"
        onClick={handleInstall}
        aria-label="Download Seijun as App"
        className={cn(
          "w-full min-h-[44px] h-auto py-2.5 px-4 text-sm font-semibold rounded-xl border border-primary/25 bg-card/60 dark:bg-card/40 text-primary hover:bg-lavender/40 dark:hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center gap-2 text-center whitespace-normal focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40",
          className
        )}
      >
        <Download className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{label}</span>
      </Button>
    </div>
  )
}
