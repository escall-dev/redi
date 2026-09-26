"use client"

import * as React from "react"
import { useCycleContext } from "@/lib/cycle-context/cycle-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  User,
  HeartHandshake,
  Sparkles,
  ShieldCheck,
  Eye,
  CheckCircle2,
} from "lucide-react"

interface CycleContextSwitcherProps {
  className?: string
  compact?: boolean
}

/**
 * Seijun Phase 19.1: Cycle Context Switcher & Status Indicator
 *
 * Provides clear UI affordances:
 *  - For 'both' users: An explicit, intuitive segmented toggle to switch between
 *    "My Cycle" and "Partner's Cycle".
 *  - For 'supporter' users: A clear, reassuring indicator that the current view
 *    and actions represent the connected partner's cycle.
 */
export function CycleContextSwitcher({
  className,
  compact = false,
}: CycleContextSwitcherProps) {
  const { context, switchContext } = useCycleContext()
  const { mode, isPartnerContext, usageRole, partnerInfo, canSwitchContext } = context
  const partnerName = partnerInfo.displayName || "Partner"

  // Only render switcher control for 'both' users with an active partner
  if (canSwitchContext) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 bg-secondary/60 dark:bg-secondary/40 border border-border/70 rounded-2xl shadow-2xs backdrop-blur-xs">
            <button
              type="button"
              onClick={() => switchContext("own")}
              aria-pressed={mode === "own"}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                mode === "own"
                  ? "bg-background text-foreground shadow-xs border border-border/60 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="size-3.5" />
              <span>My Cycle</span>
            </button>

            <button
              type="button"
              onClick={() => switchContext("partner")}
              aria-pressed={mode === "partner"}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                mode === "partner"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-xs border border-rose-500/30 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HeartHandshake className="size-3.5" />
              <span>{partnerName}&apos;s Cycle</span>
            </button>
          </div>

          <Badge
            variant={isPartnerContext ? "outline" : "secondary"}
            className={cn(
              "text-[10px] px-2 py-0.5 font-medium shrink-0",
              isPartnerContext
                ? "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5"
                : "border-border/60 text-muted-foreground"
            )}
          >
            {isPartnerContext ? "Partner Context" : "Personal Context"}
          </Badge>
        </div>

        {/* Informative helper note when operating on partner cycle */}
        {isPartnerContext && !compact && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300">
            <Sparkles className="size-3.5 shrink-0 text-rose-500" />
            <span className="leading-tight">
              Viewing <strong>{partnerName}&apos;s cycle</strong>. Actions and data target your partner according to granted permissions.
            </span>
          </div>
        )}
      </div>
    )
  }

  // For pure supporters with an active partner, display clear context indicator
  if (usageRole === "supporter" && partnerInfo.hasActivePartner) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-lavender/30 dark:bg-lavender/15 border border-lavender-border/70 text-xs shadow-2xs",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-lavender flex items-center justify-center text-primary shrink-0 border border-lavender-border/60">
            <HeartHandshake className="size-3.5" />
          </div>
          <div className="leading-tight">
            <span className="font-semibold text-foreground">{partnerName}&apos;s Cycle</span>
            <span className="text-muted-foreground ml-1.5 text-[11px]">• Supporter Mode</span>
          </div>
        </div>

        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0.5 border-primary/30 text-primary bg-primary/5 font-medium"
        >
          Primary Context
        </Badge>
      </div>
    )
  }

  return null
}
