import * as React from "react"
import { cn } from "@/lib/utils"

interface SettingsDividerProps {
  className?: string
  inset?: boolean
}

export function SettingsDivider({ className, inset = true }: SettingsDividerProps) {
  return (
    <div
      role="separator"
      className={cn(
        "h-px bg-border/40 w-full",
        inset && "ml-14 sm:ml-16 w-[calc(100%-3.5rem)] sm:w-[calc(100%-4rem)]",
        className
      )}
    />
  )
}
