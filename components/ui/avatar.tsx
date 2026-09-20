"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { User } from "lucide-react"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallbackInitials?: string | null
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
}

const sizeClasses = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
  "2xl": "size-28 text-2xl",
}

export function Avatar({
  src,
  alt = "User avatar",
  fallbackInitials,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)
  const isCustomImage = src && !src.startsWith("preset:") && failedSrc !== src

  const initials = React.useMemo(() => {
    if (!fallbackInitials) return null
    const parts = fallbackInitials.trim().split(/\s+/)
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }, [fallbackInitials])

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-lavender/50 text-primary shadow-2xs select-none transition-all",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {isCustomImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setFailedSrc(src)}
          className="size-full object-cover object-center"
        />
      ) : initials ? (
        <span className="font-semibold text-primary tracking-tight">
          {initials}
        </span>
      ) : (
        <User className="size-1/2 text-primary/70 stroke-[2.2]" />
      )}
    </div>
  )
}
