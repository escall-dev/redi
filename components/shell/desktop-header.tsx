"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { RediBrand } from "@/components/brand/redi-brand"
import { NAV_ITEMS } from "@/components/shell/app-nav-items"
import { useQuickLog } from "@/components/shell/quick-log-context"
import { Plus, Bell, LogOut, Loader2, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { logoutAction } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Avatar } from "@/components/ui/avatar"
import { useUserProfile } from "@/lib/hooks/use-user-profile"
import { NotificationBell } from "@/components/notifications/notification-bell"

export function DesktopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { openQuickLog } = useQuickLog()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const { avatarUrl, displayName } = useUserProfile()

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

        {/* Right Action: Theme Toggle, Notifications & Logout */}
        <div className="flex items-center gap-2">
          {/* Quick Theme Toggle */}
          <ThemeToggle />

          {/* Dynamic In-App Notification Center */}
          <NotificationBell />

          {/* Profile Avatar Link */}
          <Link
            href="/settings/profile"
            aria-label="User Profile Details"
            className={cn(
              "size-9 rounded-2xl border flex items-center justify-center text-primary transition-all active:scale-95 shadow-xs overflow-hidden",
              pathname === "/settings/profile"
                ? "bg-lavender text-lavender-foreground border-lavender-border ring-2 ring-primary/40 shadow-xs"
                : "bg-secondary/70 hover:bg-secondary border-border/50"
            )}
          >
            {avatarUrl ? (
              <Avatar
                src={avatarUrl}
                alt={displayName || "Profile"}
                fallbackInitials={displayName}
                size="sm"
                className="size-7 border-0 shadow-none bg-transparent"
              />
            ) : (
              <User className="size-4 stroke-[2.2]" />
            )}
          </Link>

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
