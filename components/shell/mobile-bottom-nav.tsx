"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/components/shell/app-nav-items"
import { useQuickLog } from "@/components/shell/quick-log-context"
import { Plus } from "lucide-react"

export function MobileBottomNav() {
  const pathname = usePathname()
  const { openQuickLog } = useQuickLog()
  // useSyncExternalStore: server snapshot = false, client snapshot = true.
  // This is the recommended React pattern for SSR-safe "is mounted" detection.
  const mounted = React.useSyncExternalStore(
    (cb) => { window.addEventListener("focus", cb); return () => window.removeEventListener("focus", cb) },
    () => true,
    () => false
  )

  const homeItem = NAV_ITEMS[0] // Home
  const calendarItem = NAV_ITEMS[1] // Calendar
  const historyItem = NAV_ITEMS[2] // History
  const settingsItem = NAV_ITEMS[3] // Settings

  const renderNavLink = (item: (typeof NAV_ITEMS)[number]) => {
    const Icon = item.icon
    // Before mount, treat nothing as active so SSR HTML matches the initial client render.
    const isActive =
      mounted &&
      (pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href)))

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "relative flex min-h-[48px] w-full flex-col items-center justify-center pt-2 pb-1 transition-all select-none active:scale-95",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {/* Active Indicator: 2px bar at top edge as per guideline */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute top-0 h-[2px] w-5 rounded-full transition-all duration-200",
            isActive ? "bg-primary opacity-100 scale-x-100" : "bg-transparent opacity-0 scale-x-50"
          )}
        />

        {/* Icon: 24px size as per guideline */}
        <div className="flex items-center justify-center">
          <Icon
            className={cn(
              "size-6 transition-all duration-200",
              isActive ? "text-primary stroke-[2.2]" : "text-muted-foreground stroke-[1.8]"
            )}
          />
        </div>

        {/* Font Size: 12px label as per guideline */}
        <span
          className={cn(
            "text-[12px] leading-tight tracking-tight transition-colors mt-0.5",
            isActive ? "font-semibold text-primary" : "font-normal text-muted-foreground"
          )}
        >
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 block border-t border-border/70 bg-card/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-0 shadow-[0_-4px_16px_rgba(76,45,115,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md sm:hidden overflow-visible"
    >
      <div className="grid grid-cols-5 items-center justify-items-center px-1 w-full max-w-md mx-auto">
        {/* 1. Home */}
        {renderNavLink(homeItem)}

        {/* 2. Calendar */}
        {renderNavLink(calendarItem)}

        {/* 3. Center Action Button: 52px inner circle inside 72px clearance as per guideline */}
        <div className="relative flex flex-col items-center justify-end w-full">
          <button
            type="button"
            onClick={openQuickLog}
            aria-label="Log Period"
            className="group relative flex flex-col items-center justify-center select-none active:scale-95 transition-all -mt-9 focus:outline-none"
          >
            {/* 72px Outer Clearance / Halo */}
            <div className="flex size-[72px] items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border/70 shadow-[0_-2px_12px_rgba(76,45,115,0.06)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.6)]">
              {/* 52px Inner Action Button */}
              <div className="flex size-[52px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_18px_rgba(76,45,115,0.28)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.6)] group-hover:scale-105 group-hover:shadow-[0_8px_24px_rgba(76,45,115,0.36)] dark:group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.7)] transition-all">
                <Plus className="size-6 stroke-[2.5]" />
              </div>
            </div>
            <span className="text-[12px] leading-tight tracking-tight font-medium text-primary mt-1">
              Log
            </span>
          </button>
        </div>

        {/* 4. History */}
        {renderNavLink(historyItem)}

        {/* 5. Settings */}
        {renderNavLink(settingsItem)}
      </div>
    </nav>
  )
}

