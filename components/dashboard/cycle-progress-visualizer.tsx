import * as React from "react"
import { Droplet } from "lucide-react"
import { cn } from "@/lib/utils"

interface CycleProgressVisualizerProps {
  currentDay: number
  expectedTotalDays: number
  periodDaysCount?: number
  isOnPeriod?: boolean
  className?: string
}

export function CycleProgressVisualizer({
  currentDay,
  expectedTotalDays,
  periodDaysCount = 0,
  isOnPeriod = false,
  className,
}: CycleProgressVisualizerProps) {
  const safeTotal = Math.max(1, expectedTotalDays)
  const clampedDay = Math.max(1, currentDay)
  const progressPercent = Math.min(100, Math.max(0, Math.round((clampedDay / safeTotal) * 100)))

  // Period portion percentage if period days are known
  const periodDaysPercent = periodDaysCount > 0
    ? Math.min(100, Math.round((periodDaysCount / safeTotal) * 100))
    : 0

  return (
    <div className={cn("space-y-3", className)}>
      {/* Visual Header / Metric Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <span className="text-primary font-semibold">Day {clampedDay}</span>
          <span className="text-muted-foreground">of ~{safeTotal} days</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {progressPercent}% through cycle
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative h-3 w-full rounded-full bg-secondary/80 overflow-hidden border border-border/60">
        {/* Period Days Zone (if period days are recorded) */}
        {periodDaysPercent > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-primary/20 border-r border-primary/40 z-0 transition-all duration-300"
            style={{ width: `${periodDaysPercent}%` }}
            title={`${periodDaysCount} period days logged`}
          />
        )}

        {/* Main Cycle Progress Fill */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 relative z-10",
            isOnPeriod
              ? "bg-gradient-to-r from-primary via-primary to-primary/90"
              : "bg-gradient-to-r from-primary/80 via-primary to-pink-accent-foreground"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Track Legend / Markers */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
        <span className="flex items-center gap-1">
          {periodDaysCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-primary font-medium">
              <Droplet className="size-3" />
              {periodDaysCount}d period
            </span>
          )}
          {periodDaysCount === 0 && <span>Start (Day 1)</span>}
        </span>

        <span className="text-muted-foreground/80">
          Day {Math.round(safeTotal / 2)}
        </span>

        <span>~Day {safeTotal}</span>
      </div>
    </div>
  )
}
