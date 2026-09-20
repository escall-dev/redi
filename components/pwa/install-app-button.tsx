"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Info, X } from "lucide-react"

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
}: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null)
  const [showGuide, setShowGuide] = React.useState<boolean>(false)

  const isStandalone = React.useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot
  )

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar on mobile browsers
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    )

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        await deferredPrompt.userChoice
      } catch {
        // Ignore or handle gracefully
      } finally {
        setDeferredPrompt(null)
      }
    } else {
      // Toggle installation guidance for iOS or browsers without beforeinstallprompt
      setShowGuide((prev) => !prev)
    }
  }

  // Do not show button if Seijun is already running as an installed standalone PWA
  if (isStandalone) {
    return null
  }

  return (
    <div className="w-full space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleInstall}
        className={cn(
          "w-full h-11 text-sm font-semibold rounded-xl border border-primary/25 bg-card text-primary hover:bg-lavender/40 hover:text-primary transition-all cursor-pointer shadow-2xs",
          className
        )}
      >
        {label}
      </Button>

      {showGuide && (
        <div
          role="status"
          className="relative flex items-start gap-2.5 rounded-xl border border-lavender-border/80 bg-lavender/40 p-3 text-xs text-foreground animate-in fade-in-50 duration-200"
        >
          <Info className="size-4 shrink-0 mt-0.5 text-primary" />
          <div className="flex-1 leading-snug">
            <p className="font-medium text-foreground">How to install:</p>
            <p className="text-muted-foreground mt-0.5">
              • <strong>iOS (Safari)</strong>: Tap the Share button, then select <em>Add to Home Screen</em>.
            </p>
            <p className="text-muted-foreground mt-0.5">
              • <strong>Chrome/Edge</strong>: Tap the install icon in the address bar or browser menu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(false)}
            aria-label="Close instructions"
            className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
