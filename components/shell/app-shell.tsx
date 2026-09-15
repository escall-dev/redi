import * as React from "react"
import { DesktopHeader } from "@/components/shell/desktop-header"
import { MobileHeader } from "@/components/shell/mobile-header"
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
  className?: string
}

export function AppShell({ children, className }: AppShellProps) {
  return (
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
  )
}
