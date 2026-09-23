import * as React from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SettingsPageHeaderProps {
  badgeText?: string
  badgeIcon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  onBack?: () => void
}

export function SettingsPageHeader({
  badgeText = "Settings",
  badgeIcon: BadgeIcon,
  title,
  description,
  backHref = "/settings",
  backLabel = "Settings",
  onBack,
}: SettingsPageHeaderProps) {
  const backButtonContent = (
    <>
      <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
      <span>Back to {backLabel}</span>
    </>
  )

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {/* Back Link or Instant Action */}
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group select-none py-1 -ml-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        >
          {backButtonContent}
        </button>
      ) : (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group select-none py-1 -ml-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        >
          {backButtonContent}
        </Link>
      )}

      <div className="space-y-1">
        {badgeText && (
          <div className="flex items-center gap-2">
            <Badge variant="lavender" className="gap-1.5 font-normal text-xs px-2.5 py-0.5">
              {BadgeIcon && <BadgeIcon className="size-3 text-primary" />}
              {badgeText}
            </Badge>
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
