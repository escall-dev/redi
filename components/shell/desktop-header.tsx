"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { RediBrand } from "@/components/brand/redi-brand"
import { NAV_ITEMS } from "@/components/shell/app-nav-items"
import { Badge } from "@/components/ui/badge"
import { Shield } from "lucide-react"

export function DesktopHeader() {
  const pathname = usePathname()

  return (
    <header className="hidden sm:block sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <RediBrand size="md" />
        </div>

        {/* Navigation Menu: Centered Soft Pill */}
        <nav className="flex items-center gap-1 rounded-full border border-border/70 bg-card/60 p-1 shadow-xs backdrop-blur-xs">
          {NAV_ITEMS.map((item) => {
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
          })}
        </nav>

        {/* Right Action: Privacy Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="lavender"
            className="hidden md:inline-flex gap-1.5 py-1 px-3 text-[11px] font-normal"
          >
            <Shield className="size-3 text-primary" />
            <span>Private</span>
          </Badge>
        </div>
      </div>
    </header>
  )
}
