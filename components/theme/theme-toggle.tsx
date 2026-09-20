"use client"

import * as React from "react"
import { useTheme } from "@/components/theme/theme-provider"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme, mounted } = useTheme()

  const handleToggle = () => {
    // Toggles between light and dark
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
  }

  const isDark = mounted ? resolvedTheme === "dark" : false

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "size-9 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/50 flex items-center justify-center text-primary transition-all active:scale-95 shadow-xs focus:outline-none cursor-pointer",
        className
      )}
    >
      {isDark ? (
        <Sun className="size-4 stroke-[2.2] transition-transform duration-200" />
      ) : (
        <Moon className="size-4 stroke-[2.2] transition-transform duration-200" />
      )}
    </button>
  )
}
