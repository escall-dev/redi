"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import {
  HeartHandshake,
  ShieldCheck,
  Shield,
  Sliders,
  Sparkles,
  ArrowRight,
  Eye,
  CalendarHeart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { calculateRelationshipDuration } from "@/lib/partner/affinity"
import type { AffinityDisplayFormat } from "@/lib/partner/types"

export interface RelationshipContextCardProps {
  userDisplayName: string
  userAvatarUrl?: string | null
  partnerDisplayName: string
  partnerUsername?: string | null
  partnerAvatarUrl?: string | null
  relationshipRole?: "owner" | "supporter"
  relationshipStartDate?: string | null
  affinityDisplayFormat?: AffinityDisplayFormat
  sharedCategoriesCount?: number
  totalCategoriesCount?: number
  isCoManagementActive?: boolean
  className?: string
}

export function RelationshipContextCard({
  userDisplayName,
  userAvatarUrl,
  partnerDisplayName,
  partnerUsername,
  partnerAvatarUrl,
  relationshipRole = "owner",
  relationshipStartDate,
  affinityDisplayFormat = "detailed",
  sharedCategoriesCount = 0,
  totalCategoriesCount = 4,
  isCoManagementActive = false,
  className,
}: RelationshipContextCardProps) {
  // Dynamic duration calculation
  const durationText = React.useMemo(() => {
    if (!relationshipStartDate) return null
    try {
      const today = new Date().toISOString().split("T")[0]
      const res = calculateRelationshipDuration(
        relationshipStartDate,
        today,
        affinityDisplayFormat
      )
      return res?.formattedText || null
    } catch {
      return null
    }
  }, [relationshipStartDate, affinityDisplayFormat])

  const isOwner = relationshipRole === "owner"

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-3xl border border-lavender-border/80 bg-gradient-to-br from-lavender/30 via-background to-card shadow-xs transition-all",
        className
      )}
    >
      {/* Subtle decorative glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: Interlinked Avatars + Identity & Duration */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Dual Interlinked Avatars with Overlapping Rings */}
            <div className="relative flex items-center shrink-0 py-1">
              {/* User Avatar */}
              <div className="relative z-10">
                <Avatar
                  src={userAvatarUrl}
                  alt={userDisplayName}
                  fallbackInitials={userDisplayName}
                  size="md"
                  className="size-11 sm:size-12 ring-2 ring-background shadow-xs border-2 border-primary/20"
                />
              </div>

              {/* Heart bridge badge */}
              <div className="absolute left-7 sm:left-8 -bottom-1 z-20 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs ring-2 ring-background">
                <HeartHandshake className="size-2.5 stroke-[2.4]" />
              </div>

              {/* Partner Avatar (Overlapping) */}
              <div className="relative z-0 -ml-3 sm:-ml-3.5">
                <Avatar
                  src={partnerAvatarUrl}
                  alt={partnerDisplayName}
                  fallbackInitials={partnerDisplayName}
                  size="md"
                  className="size-11 sm:size-12 ring-2 ring-background shadow-xs border-2 border-lavender-border bg-lavender/60"
                />
              </div>
            </div>

            {/* Couple Context Text */}
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="lavender"
                  className="text-[10px] px-2 py-0.5 font-medium gap-1 bg-lavender/70 border-lavender-border/80 text-primary"
                >
                  <Sparkles className="size-2.5 text-primary" />
                  <span>Our Space</span>
                </Badge>

                {durationText ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full border border-border/50">
                    <CalendarHeart className="size-3 text-rose-500" />
                    <span>Together for {durationText}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full border border-border/40">
                    <HeartHandshake className="size-3 text-primary/70" />
                    <span>Connected</span>
                  </span>
                )}
              </div>

              <h2 className="text-sm sm:text-base font-bold text-foreground truncate tracking-tight">
                {userDisplayName} &amp; {partnerDisplayName}
              </h2>

              <p className="text-xs text-muted-foreground truncate">
                {isOwner ? (
                  <span>Connected with your supporter</span>
                ) : (
                  <span>Supporting {partnerDisplayName}&apos;s cycle</span>
                )}
                {partnerUsername && (
                  <span className="font-mono text-primary font-medium ml-1">
                    @{partnerUsername}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Privacy Sharing Status Pill & Settings Link */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
            {/* Privacy Status Pill */}
            {isOwner ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background/80 dark:bg-card/80 border border-border/60 text-xs">
                {sharedCategoriesCount > 0 ? (
                  <>
                    <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[11px] font-medium text-foreground">
                      Sharing {sharedCategoriesCount} of {totalCategoriesCount} items
                    </span>
                  </>
                ) : (
                  <>
                    <Shield className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Private (0 shared)
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background/80 dark:bg-card/80 border border-border/60 text-xs">
                {isCoManagementActive ? (
                  <>
                    <Sparkles className="size-3.5 text-primary shrink-0" />
                    <span className="text-[11px] font-medium text-foreground">
                      Co-Management Active
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Read-Only Partner
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Quick Action Button */}
            <Link
              href={isOwner ? "/settings/partner" : "/partner"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground hover:text-primary transition-all border border-border/60 shadow-2xs select-none active:scale-95"
            >
              {isOwner ? (
                <>
                  <Sliders className="size-3 text-primary" />
                  <span className="hidden sm:inline">Manage Sharing</span>
                  <span className="sm:hidden">Sharing</span>
                </>
              ) : (
                <>
                  <Eye className="size-3 text-primary" />
                  <span className="hidden sm:inline">View Our Shared Space</span>
                  <span className="sm:hidden">Shared Space</span>
                </>
              )}
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
