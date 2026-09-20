"use client"

import * as React from "react"
import { useTheme, type Theme } from "@/components/theme/theme-provider"
import { Sun, Moon, Laptop } from "lucide-react"
import { cn } from "@/lib/utils"

const OPTIONS: {
  value: Theme
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
]

export function ThemeSelector() {
  const { theme, resolvedTheme, setTheme, mounted } = useTheme()

  return (
    <div className="flex flex-col items-center text-center p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-3">
      <div className="space-y-0.5">
        <span className="text-sm font-medium text-foreground block">
          Theme Mode
        </span>
        <span className="text-xs text-muted-foreground">
          {mounted
            ? theme === "system"
              ? `System preference active (currently ${resolvedTheme})`
              : `${theme.charAt(0).toUpperCase() + theme.slice(1)} mode active`
            : "Select visual appearance"}
        </span>
      </div>

      {/* Centered Segmented Pill Toggle with balanced widths */}
      <div className="w-full flex justify-center">
        <div
          role="radiogroup"
          aria-label="Interface theme"
          className="inline-grid grid-cols-3 gap-1 rounded-xl bg-background/80 dark:bg-card/90 p-1 border border-border/70 shadow-xs w-full max-w-xs sm:max-w-sm"
        >
          {OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isSelected = mounted ? theme === opt.value : opt.value === "system"

            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95",
                  isSelected
                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
