import * as React from "react"
import Link from "next/link"
import { RediLogo } from "@/components/brand/redi-logo"
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
        "inline-flex items-center gap-2.5 select-none transition-opacity hover:opacity-95 group",
        className
      )}
      {...props}
    >
      {/* Authentic Redi Logo Emblem with soft elevation */}
      <div className="relative flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
        <RediLogo
          size={size === "sm" ? "sm" : size === "lg" ? "lg" : "md"}
          className="drop-shadow-xs"
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
            Personal Cycle Tracker
          </span>
        )}
      </div>
    </div>
  )

  if (withLink) {
    return (
      <Link
        href="/dashboard"
        className="focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40 rounded-xl"
      >
        {content}
      </Link>
    )
  }

  return content
}
