"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { SettingsToggle } from "@/components/settings/settings-toggle"
import type { SettingsItemConfig } from "@/components/settings/settings-types"

interface SettingsItemProps extends SettingsItemConfig {
  className?: string
}

export function SettingsItem({
  id,
  title,
  description,
  value,
  icon: Icon,
  iconColor,
  href,
  onClick,
  badge,
  toggle,
  destructive = false,
  disabled = false,
  external = false,
  hideChevron = false,
  className,
}: SettingsItemProps) {
  const isInteractive = Boolean(href || onClick) && !toggle

  const content = (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-3 px-2 transition-colors select-none rounded-xl",
        isInteractive && "hover:bg-secondary/30 active:bg-secondary/50 cursor-pointer",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {/* Leading Icon & Label */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <Icon
          className={cn(
            "size-5 shrink-0 stroke-[2]",
            destructive ? "text-destructive" : "text-foreground/80",
            iconColor
          )}
        />

        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium tracking-tight truncate",
                destructive ? "text-destructive" : "text-foreground"
              )}
            >
              {title}
            </span>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground truncate leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Trailing Controls / Chevrons */}
      <div className="flex items-center gap-2 shrink-0">
        {value && (
          <span className="text-xs sm:text-sm text-muted-foreground font-normal max-w-[140px] sm:max-w-[200px] truncate text-right">
            {value}
          </span>
        )}

        {toggle && (
          <SettingsToggle
            id={`toggle-${id}`}
            checked={toggle.checked}
            onChange={toggle.onChange}
            disabled={toggle.disabled || disabled}
            ariaLabel={toggle.ariaLabel || `${title} toggle`}
          />
        )}

        {isInteractive && !hideChevron && (
          <div className="text-primary transition-transform duration-150">
            {external ? (
              <ExternalLink className="size-4" />
            ) : (
              <ChevronRight className="size-4.5 stroke-[2.5]" />
            )}
          </div>
        )}
      </div>
    </div>
  )

  // Prioritize instant client action if provided
  if (onClick && !disabled) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset cursor-pointer rounded-xl"
      >
        {content}
      </button>
    )
  }

  if (href && !disabled) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-xl"
        >
          {content}
        </a>
      )
    }

    return (
      <Link
        href={href}
        prefetch={true}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-xl"
      >
        {content}
      </Link>
    )
  }

  return <div>{content}</div>
}
