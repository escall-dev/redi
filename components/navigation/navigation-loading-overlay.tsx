"use client"

import * as React from "react"
import { SeijunSpinner } from "@/components/ui/seijun-spinner"
import { useNavigationLoading } from "@/components/navigation/navigation-loading-context"
import { cn } from "@/lib/utils"

/**
 * Global Navigation Loading Overlay
 *
 * Appears during slow route transitions (> 200ms threshold) to communicate
 * immediate responsiveness without interfering with fast/instant navigations.
 *
 * Implements WAI-ARIA role="status", aria-live="polite", and aria-busy="true"
 * with complete support for light/dark themes, safe-area padding, and PWA viewports.
 */
export function NavigationLoadingOverlay() {
  const { isLoading } = useNavigationLoading()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isLoading) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading page content"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center p-4",
        "w-screen h-dvh max-w-full overflow-hidden",
        "bg-background/70 dark:bg-background/80 backdrop-blur-xs",
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        "animate-in fade-in duration-150 select-none cursor-wait"
      )}
    >
      {/* Centered elevated floating card matching Seijun design system */}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 px-8 py-6 rounded-3xl",
          "bg-card/95 dark:bg-card/95 border border-border/80",
          "shadow-xl shadow-primary/5 dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
        )}
      >
        {/* Purple & White Circular Spinner */}
        <SeijunSpinner size="lg" aria-hidden="true" />

        {/* Text Label */}
        <span className="text-sm font-medium tracking-tight text-foreground select-none">
          Loading...
        </span>

        {/* Assistive Technology Description */}
        <span className="sr-only">Navigating to page, please wait</span>
      </div>
    </div>
  )
}
