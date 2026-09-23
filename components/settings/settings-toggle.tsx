"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface SettingsToggleProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  loading?: boolean
  ariaLabel?: string
  className?: string
}

export function SettingsToggle({
  id,
  checked,
  onChange,
  disabled = false,
  loading = false,
  ariaLabel = "Toggle setting",
  className,
}: SettingsToggleProps) {
  const handleToggle = () => {
    if (disabled || loading) return
    onChange(!checked)
  }

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled || loading}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleToggle()
        }
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted-foreground/30",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      >
        {loading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </span>
    </button>
  )
}
