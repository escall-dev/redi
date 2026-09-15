import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface RediBrandProps extends React.ComponentProps<"div"> {
  size?: "sm" | "md" | "lg"
  withLink?: boolean
  showTagline?: boolean
}

export function RediBrand({
  size = "md",
  withLink = true,
  showTagline = false,
  className,
  ...props
}: RediBrandProps) {
  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 select-none transition-opacity hover:opacity-90",
        className
      )}
      {...props}
    >
      {/* Redi Emblem Placeholder: Soft, calming cycle droplet/orb */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-[oklch(0.62_0.16_305)] text-primary-foreground shadow-xs transition-transform group-hover:scale-105",
          size === "sm" && "size-7 rounded-xl",
          size === "md" && "size-9 rounded-xl",
          size === "lg" && "size-11 rounded-2xl"
        )}
      >
        {/* Soft inner organic petal/crescent accent */}
        <div
          className={cn(
            "rounded-full bg-white/25 backdrop-blur-xs",
            size === "sm" && "size-3",
            size === "md" && "size-4",
            size === "lg" && "size-5"
          )}
        />
      </div>

      {/* Typography */}
      <div className="flex flex-col text-left leading-none">
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "sm" && "text-base",
            size === "md" && "text-xl",
            size === "lg" && "text-2xl"
          )}
        >
          Redi
        </span>
        {showTagline && (
          <span className="text-[11px] text-muted-foreground font-normal mt-0.5">
            Private Cycle Care
          </span>
        )}
      </div>
    </div>
  )

  if (withLink) {
    return (
      <Link href="/dashboard" className="focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40 rounded-xl">
        {content}
      </Link>
    )
  }

  return content
}
