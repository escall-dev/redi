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
          "flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-xl py-1 transition-all select-none active:scale-95",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl px-3 py-1 transition-all",
            isActive
              ? "bg-lavender text-primary border border-lavender-border/70 shadow-xs"
              : "text-muted-foreground"
          )}
        >
          <Icon className={cn("size-5", isActive ? "text-primary stroke-[2.2]" : "stroke-[1.8]")} />
        </div>
        <span
          className={cn(
            "text-[11px] tracking-tight transition-colors",
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
      className="fixed bottom-0 left-0 right-0 z-50 block border-t border-border/70 bg-card/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgba(76,45,115,0.05)] backdrop-blur-md sm:hidden overflow-visible"
    >
      <div className="grid grid-cols-5 items-center justify-items-center px-1">
        {/* 1. Home */}
        {renderNavLink(homeItem)}

        {/* 2. Calendar */}
        {renderNavLink(calendarItem)}

        {/* 3. Center Dominant Quick Log Action */}
        <div className="relative flex flex-col items-center justify-end w-full">
          <button
            type="button"
            onClick={openQuickLog}
            aria-label="Log Period"
            className="group relative flex flex-col items-center justify-center select-none active:scale-95 transition-all -mt-7.5 focus:outline-none"
          >
            <div className="flex size-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(76,45,115,0.28)] border-4 border-card group-hover:scale-105 group-hover:shadow-[0_10px_25px_rgba(76,45,115,0.38)] transition-all">
              <Plus className="size-7 stroke-[2.8]" />
            </div>
            <span className="text-[11px] tracking-tight font-medium text-primary mt-1">
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
