"use client"

import * as React from "react"

/**
 * ServiceWorkerRegistration
 *
 * Registers the root-scoped `/sw.js` Service Worker to prepare for Web Push notifications.
 *
 * Registration characteristics:
 * - Executes strictly in the browser environment (`typeof window !== "undefined"`).
 * - Defers execution until after the window `load` event (or immediately if already complete)
 *   to ensure zero impact on critical rendering, hydration, and Time to Interactive (TTI).
 * - Does not intercept fetch requests or cache assets, ensuring zero interference with
 *   Next.js fast-refresh/HMR, Supabase auth cookies, and Server Actions in both dev and prod.
 */
export function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const registerSW = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        })
      } catch (error) {
        // Suppress failure in unsupported or blocked environments
        if (process.env.NODE_ENV === "development") {
          console.warn("[SW] Registration skipped or failed:", error)
        }
      }
    }

    if (document.readyState === "complete") {
      registerSW()
    } else {
      window.addEventListener("load", registerSW, { once: true })
      return () => window.removeEventListener("load", registerSW)
    }
  }, [])

  return null
}
