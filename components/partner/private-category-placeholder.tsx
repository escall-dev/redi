"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  Droplets,
  Settings2,
  BookOpen,
  EyeOff,
  Sliders,
  Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SharingCategory } from "@/lib/partner/authorization"

export interface PrivateCategoryPlaceholderProps {
  category: SharingCategory
  partnerDisplayName?: string
  isOwner?: boolean
  className?: string
  onManageSharing?: () => void
}

const CATEGORY_META: Record<
  SharingCategory,
  {
    title: string
    supporterDescription: (partnerName: string) => string
    ownerDescription: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  cycle_estimates: {
    title: "Cycle Estimates",
    supporterDescription: (name) =>
      `Current phase and cycle estimates are kept private until ${name} chooses to share them.`,
    ownerDescription: "Cycle day and phase estimates are currently kept private.",
    icon: Activity,
  },
  period_status: {
    title: "Period Status",
    supporterDescription: (name) =>
      `Active bleeding and flow tracking are kept private until ${name} chooses to share them.`,
    ownerDescription: "Active period tracking is currently kept private.",
    icon: Droplets,
  },
  cycle_preferences: {
    title: "Cycle Preferences",
    supporterDescription: (name) =>
      `Target cycle lengths and preferences are kept private until ${name} chooses to share them.`,
    ownerDescription: "Typical cycle length targets are currently kept private.",
    icon: Settings2,
  },
  daily_notes: {
    title: "Daily Notes",
    supporterDescription: (name) =>
      `Personal journal observations and logs are kept private until ${name} chooses to share them.`,
    ownerDescription: "Daily journal observations are currently kept private.",
    icon: BookOpen,
  },
}

/**
 * Seijun Phase 21: Reusable Private Category Placeholder
 *
 * Provides a calm, privacy-aware presentation for shared categories that are
 * intentionally unavailable or unshared. Never reveals underlying private data.
 *
 * Distinct experiences:
 * - Supporter: Reassuring message that data is kept confidential by their partner.
 * - Owner: Clear indication that the category is not shared with their partner, with optional management action.
 */
export function PrivateCategoryPlaceholder({
  category,
  partnerDisplayName = "your partner",
  isOwner = false,
  className,
  onManageSharing,
}: PrivateCategoryPlaceholderProps) {
  const meta = CATEGORY_META[category] || {
    title: "Private Category",
    supporterDescription: () => "This category is kept private by your partner.",
    ownerDescription: "This category is currently kept private.",
    icon: Lock,
  }

  const Icon = meta.icon

  return (
    <Card
      className={cn(
        "border-border/50 bg-secondary/15 opacity-85 hover:opacity-100 transition-opacity rounded-2xl shadow-2xs select-none",
        className
      )}
    >
      <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex size-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground shrink-0 mt-0.5 border border-border/40">
            <Icon className="size-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold text-foreground truncate">{meta.title}</p>
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 font-normal border-border/60 text-muted-foreground bg-background/50"
              >
                {isOwner ? "Not shared with partner" : "Private for now"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isOwner
                ? meta.ownerDescription
                : meta.supporterDescription(partnerDisplayName)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0 pt-1 sm:pt-0">
          {isOwner ? (
            onManageSharing ? (
              <button
                type="button"
                onClick={onManageSharing}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <Sliders className="size-3" />
                <span>Manage sharing</span>
              </button>
            ) : (
              <Link
                href="/settings/partner"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <Sliders className="size-3" />
                <span>Manage sharing</span>
              </Link>
            )
          ) : (
            <div className="flex items-center text-muted-foreground/60 pr-1">
              <EyeOff className="size-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
