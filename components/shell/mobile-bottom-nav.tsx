"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/components/shell/app-nav-items"

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 block border-t border-border/70 bg-card/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-4px_16px_rgba(76,45,115,0.04)] backdrop-blur-md sm:hidden"
    >
      <div className="grid grid-cols-4 items-center justify-items-center px-1">
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
                "flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-xl py-1 transition-all select-none active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full px-3 py-1 transition-all",
                  isActive
                    ? "bg-lavender text-primary border border-lavender-border/70 shadow-xs"
                    : "text-muted-foreground"
                )}
              >
                <Icon className={cn("size-5", isActive ? "text-primary stroke-[2.2]" : "stroke-[1.8]")} />
              </div>
              <span
                className={cn(
                  "text-[10px] tracking-tight transition-colors",
                  isActive ? "font-semibold text-primary" : "font-normal text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
