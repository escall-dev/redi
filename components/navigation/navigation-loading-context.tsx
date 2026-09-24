"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

interface NavigationLoadingContextValue {
  /**
   * Whether a slow navigation is currently underway (only true after delay threshold has passed)
   */
  isLoading: boolean
  /**
   * Manually signal navigation start. Spinner will appear after NAVIGATION_DELAY_MS if not stopped.
   */
  startLoading: (targetUrl?: string) => void
  /**
   * Signal that navigation or transition has completed. Immediately cancels timer and hides spinner.
   */
  stopLoading: () => void
}

const NavigationLoadingContext = React.createContext<NavigationLoadingContextValue>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
})

/**
 * Navigation delay threshold in milliseconds.
 *
 * Fast transitions (< 200ms) will complete before this threshold, preventing
 * any visual flicker. Transitions taking longer than 200ms will display the
 * purple-and-white loading spinner to reassure the user.
 */
export const NAVIGATION_DELAY_MS = 200

/**
 * Safety timeout: automatically reset loading state after 8 seconds
 * to guarantee the UI is never permanently trapped in a loading overlay.
 */
const SAFETY_TIMEOUT_MS = 8000

/**
 * Inner component to safely listen for searchParams and pathname changes
 * within a Suspense boundary to prevent Next.js SSR de-optimization.
 */
function NavigationEvents({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    onNavigate()
  }, [pathname, searchParams, onNavigate])

  return null
}

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = React.useState(false)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)
  const safetyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const pendingTargetRef = React.useRef<string | null>(null)
  const pathname = usePathname()

  const stopLoading = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = null
    }
    pendingTargetRef.current = null
    setIsLoading(false)
  }, [])

  const startLoading = React.useCallback(
    (targetUrl?: string) => {
      // Clear any prior active timers
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current)
        safetyTimeoutRef.current = null
      }

      pendingTargetRef.current = targetUrl || null

      // Start the threshold delay (200ms).
      // Only if the transition is still pending when the timer fires do we show the spinner.
      timerRef.current = setTimeout(() => {
        setIsLoading(true)
      }, NAVIGATION_DELAY_MS)

      // Safety timeout: ensure the loader never stays stuck indefinitely
      safetyTimeoutRef.current = setTimeout(() => {
        stopLoading()
      }, SAFETY_TIMEOUT_MS)
    },
    [stopLoading]
  )

  // Direct pathname change fallback
  React.useEffect(() => {
    stopLoading()
  }, [pathname, stopLoading])

  // Attach global link click and popstate listeners
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const handleDocumentClick = (e: MouseEvent) => {
      // 1. Ignore right clicks, middle clicks, and modified clicks (new tab/window)
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }

      // 2. Ignore already prevented events
      if (e.defaultPrevented) {
        return
      }

      // 3. Find closest anchor tag
      const target = e.target as HTMLElement | null
      const anchor = target?.closest("a")
      if (!anchor) return

      // 4. Ignore download links
      if (anchor.hasAttribute("download")) return

      // 5. Ignore non-self targets
      if (anchor.target && anchor.target !== "_self") return

      // 6. Ignore explicit opt-out
      if (anchor.getAttribute("data-no-loading") === "true") return

      // 7. Ignore non-page protocols and hash-only links
      const hrefAttr = anchor.getAttribute("href")
      if (
        !hrefAttr ||
        hrefAttr.startsWith("#") ||
        hrefAttr.startsWith("mailto:") ||
        hrefAttr.startsWith("tel:") ||
        hrefAttr.startsWith("javascript:")
      ) {
        return
      }

      let parsedUrl: URL
      try {
        parsedUrl = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      // 8. Ignore external links
      if (parsedUrl.origin !== window.location.origin) {
        return
      }

      // 9. Ignore same-page navigation (identical pathname and search params)
      const currentUrl = new URL(window.location.href)
      if (
        parsedUrl.pathname === currentUrl.pathname &&
        parsedUrl.search === currentUrl.search
      ) {
        return
      }

      // Valid internal route change initiated
      startLoading(parsedUrl.pathname + parsedUrl.search)
    }

    const handlePopState = () => {
      // Browser back/forward navigation
      startLoading(window.location.pathname + window.location.search)
    }

    const handleCustomStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ url?: string }>
      startLoading(customEvent.detail?.url)
    }

    const handleCustomStop = () => {
      stopLoading()
    }

    const handleKeydown = (e: KeyboardEvent) => {
      // Allow escape key to dismiss overlay if user cancels
      if (e.key === "Escape") {
        stopLoading()
      }
    }

    document.addEventListener("click", handleDocumentClick, { capture: true })
    window.addEventListener("popstate", handlePopState)
    window.addEventListener("seijun:navigation-start", handleCustomStart)
    window.addEventListener("seijun:navigation-stop", handleCustomStop)
    window.addEventListener("keydown", handleKeydown)

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true })
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("seijun:navigation-start", handleCustomStart)
      window.removeEventListener("seijun:navigation-stop", handleCustomStop)
      window.removeEventListener("keydown", handleKeydown)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    }
  }, [startLoading, stopLoading])

  return (
    <NavigationLoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      <React.Suspense fallback={null}>
        <NavigationEvents onNavigate={stopLoading} />
      </React.Suspense>
      {children}
    </NavigationLoadingContext.Provider>
  )
}

export function useNavigationLoading() {
  return React.useContext(NavigationLoadingContext)
}
