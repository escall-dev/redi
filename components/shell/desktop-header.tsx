"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { RediBrand } from "@/components/brand/redi-brand"
import { NAV_ITEMS } from "@/components/shell/app-nav-items"
import { useQuickLog } from "@/components/shell/quick-log-context"
import { Plus, Bell, LogOut, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { logoutAction } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"

export function DesktopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { openQuickLog } = useQuickLog()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logoutAction()
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        return
      }
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        // Ignore client error
      }
      router.push("/login")
      router.refresh()
    }
  }

  const homeItem = NAV_ITEMS[0] // Home
  const calendarItem = NAV_ITEMS[1] // Calendar
  const historyItem = NAV_ITEMS[2] // History
  const settingsItem = NAV_ITEMS[3] // Settings

  const renderLink = (item: (typeof NAV_ITEMS)[number]) => {
    const Icon = item.icon
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 select-none",
          isActive
            ? "bg-lavender text-lavender-foreground shadow-xs border border-lavender-border/70"
            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
        )}
      >
        <Icon className={cn("size-4", isActive ? "text-primary" : "text-muted-foreground")} />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <header className="hidden sm:block sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <RediBrand size="md" />
        </div>

        {/* Navigation Menu: Centered Soft Pill */}
        <nav className="flex items-center gap-1 rounded-full border border-border/70 bg-card/60 p-1 shadow-xs backdrop-blur-xs">
          {/* 1. Home */}
          {renderLink(homeItem)}

          {/* 2. Calendar */}
          {renderLink(calendarItem)}

          {/* 3. Center Quick Log Button */}
          <button
            type="button"
            onClick={openQuickLog}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 select-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs active:scale-95"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Log Period</span>
          </button>

          {/* 4. History */}
          {renderLink(historyItem)}

          {/* 5. Settings */}
          {renderLink(settingsItem)}
        </nav>

        {/* Right Action: Notifications & Logout (Private badge removed) */}
        <div className="flex items-center gap-2">
          {/* Notification Popover */}
          <Popover>
            <PopoverTrigger
              aria-label="Notifications"
              className="size-9 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/50 flex items-center justify-center text-primary transition-all active:scale-95 shadow-xs focus:outline-none"
            >
              <Bell className="size-4 stroke-[2.2]" />
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" className="w-64 p-3 text-center">
              <div className="flex flex-col items-center gap-1.5 py-2">
                <Bell className="size-6 text-primary stroke-[1.8]" />
                <span className="font-semibold text-xs">Notifications</span>
                <p className="text-[11px] text-muted-foreground">All caught up! No new notifications.</p>
              </div>
            </PopoverContent>
          </Popover>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Sign Out"
            className="size-9 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/50 flex items-center justify-center text-primary transition-all active:scale-95 shadow-xs disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4 stroke-[2.2]" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
