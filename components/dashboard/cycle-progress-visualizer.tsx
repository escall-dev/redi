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

  // Position for the glowing thumb indicator, safely clamped to avoid edge clipping
  const indicatorPosition = Math.min(98, Math.max(2, progressPercent))

  return (
    <div
      className={cn("w-full space-y-3 relative", className)}
      role="progressbar"
      aria-valuenow={progressPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`Cycle day ${clampedDay} of ${safeTotal} days, ${progressPercent}% through cycle`}
    >
      {/* Progress Track Layer */}
      <div className="relative w-full py-1">
        {/* Track Background */}
        <div className="relative h-2.5 sm:h-3 w-full rounded-full bg-secondary/80 dark:bg-secondary/40 overflow-hidden border border-border/50">
          {/* Period Days Zone (if period days are recorded) */}
          {periodDaysPercent > 0 && (
            <div
              className="absolute top-0 bottom-0 left-0 bg-primary/25 border-r border-primary/40 z-0 transition-all duration-300"
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
                : "bg-gradient-to-r from-primary via-primary/90 to-pink-accent-foreground"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Dynamic Current Position Indicator Node */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-500 ease-out"
          style={{ left: `${indicatorPosition}%` }}
        >
          <div className="relative flex items-center justify-center">
            {/* Ambient Pulse Halo */}
            <div className="absolute size-6 rounded-full bg-primary/20 dark:bg-primary/30 animate-pulse" />
            {/* Glowing Center Bead */}
            <div className="size-4 sm:size-4.5 rounded-full bg-primary border-2 border-background shadow-md ring-2 ring-primary/30" />
          </div>
        </div>
      </div>

      {/* Track Legend / Markers Row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-0.5">
        <span className="flex items-center gap-1">
          {periodDaysCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-primary font-semibold">
              <Droplet className="size-3 fill-current" />
              <span>{periodDaysCount}d period</span>
            </span>
          ) : (
            <span>Start (Day 1)</span>
          )}
        </span>

        {/* Dynamic Current Position Highlight Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold shadow-xs">
          <span>Day {clampedDay}</span>
          <span className="text-muted-foreground font-normal">· {progressPercent}%</span>
        </div>

        <span className="text-muted-foreground/90">
          ~Day {safeTotal}
        </span>
      </div>
    </div>
  )
}
