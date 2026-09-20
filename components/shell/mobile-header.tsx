"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Flame, Bell, User, LogOut, Loader2 } from "lucide-react"
import { logoutAction } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export function MobileHeader() {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const router = useRouter()

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

  return (
    <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] w-full items-center justify-between bg-background/90 px-4 backdrop-blur-md sm:hidden">
      {/* Top Left: Streaks Pill (Replaces Seijun Name) */}
      <Popover>
        <PopoverTrigger
          aria-label="Daily Streaks"
          className="flex items-center gap-1.5 rounded-full bg-secondary/80 dark:bg-card/90 border border-border/70 px-3.5 py-1.5 shadow-xs select-none hover:bg-secondary transition-all active:scale-95 focus:outline-none"
        >
          <Flame className="size-4 text-primary fill-primary/30 stroke-[2.2]" />
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-foreground">
            Streaks
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" className="w-72 p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Flame className="size-4.5 fill-primary/30" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground">Daily Logging Streak</h4>
              <p className="text-[11px] text-muted-foreground">Keep tracking your cycle daily</p>
            </div>
          </div>

          {/* Milestone Progress */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">7-Day Consistency Target</span>
              <span className="text-primary font-semibold">Active</span>
            </div>
            {/* 7-day tracker circles */}
            <div className="flex items-center justify-between px-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "size-5 rounded-full flex items-center justify-center text-[10px] font-medium border",
                    idx < 5 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-muted text-muted-foreground border-border/70"
                  )}>
                    {idx < 5 ? "✓" : ""}
                  </div>
                  <span className="text-[9px] text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/cycles"
            className="flex items-center justify-between w-full pt-1 text-xs font-medium text-primary hover:underline"
          >
            <span>View cycle history timeline</span>
            <span>→</span>
          </Link>
        </PopoverContent>
      </Popover>

      {/* Top Right: Theme Toggle, Notification Bell, Profile, Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Quick Theme Toggle */}
        <ThemeToggle />

        {/* 1. Notification Bell */}
        <Popover>
          <PopoverTrigger
            aria-label="Notifications"
            className="size-9 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/50 flex items-center justify-center text-primary transition-all active:scale-95 shadow-xs focus:outline-none"
          >
            <Bell className="size-4.5 stroke-[2.2]" />
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" className="w-80 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <div className="flex items-center gap-1.5">
                <Bell className="size-4 text-primary" />
                <span className="font-semibold text-xs text-foreground">Reminders & Alerts</span>
              </div>
              <span className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-md">
                2 new
              </span>
            </div>

            <div className="space-y-2 text-left">
              {/* Reminder 1 */}
              <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Daily Check-in</span>
                  <span className="text-[10px] text-muted-foreground">Today</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Log your symptoms, flow, or notes today to keep predictions accurate.
                </p>
              </div>

              {/* Reminder 2 */}
              <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Cycle Forecast</span>
                  <span className="text-[10px] text-muted-foreground">Forecast active</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your cycle insights are up to date. Tap Period Insights for details.
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 2. Profile Icon */}
        <Link
          href="/settings"
          aria-label="Profile Settings"
          className="size-9 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/50 flex items-center justify-center text-primary transition-all active:scale-95 shadow-xs"
        >
          <User className="size-4.5 stroke-[2.2]" />
        </Link>

        {/* 3. Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Log Out"
          className="size-9 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/50 flex items-center justify-center text-primary transition-all active:scale-95 shadow-xs disabled:opacity-50"
        >
          {isLoggingOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4.5 stroke-[2.2]" />
          )}
        </button>
      </div>
    </header>
  )
}

