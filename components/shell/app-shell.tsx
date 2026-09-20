"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { DesktopHeader } from "@/components/shell/desktop-header"
import { MobileHeader } from "@/components/shell/mobile-header"
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav"
import { QuickLogProvider } from "@/components/shell/quick-log-context"
import { SessionTimeoutProvider } from "@/components/auth/session-timeout-provider"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
  className?: string
}

export function AppShell({ children, className }: AppShellProps) {
  const pathname = usePathname()
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/onboarding"

  return (
    <SessionTimeoutProvider>
      {isAuthRoute ? (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 overflow-x-hidden pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
          <main className="w-full max-w-md mx-auto">{children}</main>
        </div>
      ) : (
        <QuickLogProvider>
          <div className="relative min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
            {/* Desktop Header */}
            <DesktopHeader />

            {/* Mobile Top Header */}
            <MobileHeader />

            {/* Main Content Area */}
            <main
              className={cn(
                "flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 pb-24 sm:pb-12 transition-all",
                className
              )}
            >
              {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
          </div>
        </QuickLogProvider>
      )}
    </SessionTimeoutProvider>
  )
}
