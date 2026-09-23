import * as React from "react"
import { cn } from "@/lib/utils"
import { SettingsItem } from "@/components/settings/settings-item"
import type { SettingsItemConfig } from "@/components/settings/settings-types"

interface SettingsSectionProps {
  id?: string
  title?: string
  description?: string
  items?: SettingsItemConfig[]
  children?: React.ReactNode
  className?: string
}

export function SettingsSection({
  id,
  title,
  description,
  items,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section id={id} className={cn("space-y-2", className)} aria-label={title}>
      {/* Category Header */}
      {title && (
        <div className="px-1 space-y-0.5">
          <h2 className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-muted-foreground/80">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground leading-normal">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Grouped Card Container */}
      <div className="rounded-2xl border border-border/70 bg-card/90 dark:bg-card/75 backdrop-blur-xs overflow-hidden divide-y divide-border/40 shadow-xs">
        {items
          ? items.map((item) => <SettingsItem key={item.id} {...item} />)
          : children}
      </div>
    </section>
  )
}
