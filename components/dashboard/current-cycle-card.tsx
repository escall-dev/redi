import * as React from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CycleProgressVisualizer } from "@/components/dashboard/cycle-progress-visualizer"
import type { CycleRecord } from "@/app/actions/cycles"
import type { CurrentCycleStatus } from "@/lib/calculations/cycle-calculations"
import { Calendar, Droplets, Droplet, ArrowRight, Activity } from "lucide-react"

interface CurrentCycleCardProps {
  currentCycle: CycleRecord | null
  statusInfo: CurrentCycleStatus
  expectedCycleLength: number
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function CurrentCycleCard({
  currentCycle,
  statusInfo,
  expectedCycleLength,
}: CurrentCycleCardProps) {
  if (!currentCycle) {
    return (
      <Card className="border-border/80 bg-card shadow-xs">
        <CardContent className="p-6 sm:p-7 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs font-normal">
                Cycle Tracking
              </Badge>
              <h2 className="text-xl font-semibold text-foreground">No active cycle</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Start tracking to follow your cycle progress, log period days, and view personal statistics.
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-muted-foreground shrink-0">
              <Activity className="size-5" />
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/cycles"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <span>Go to Cycles</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const periodDaysCount = currentCycle.period_days?.length || 0
  const currentDay = statusInfo.currentDay ?? 1

  return (
    <Card className="border-border/80 bg-gradient-to-br from-card via-card to-secondary/30 shadow-xs relative overflow-hidden">
      <CardContent className="p-6 sm:p-7 space-y-6">
        {/* Top Meta Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={statusInfo.isOnPeriod ? "default" : "lavender"}
                className="gap-1 px-2.5 py-0.5 text-xs font-medium"
              >
                {statusInfo.isOnPeriod ? (
                  <>
                    <Droplet className="size-3 fill-current" />
                    <span>On Period</span>
                  </>
                ) : (
                  <>
                    <Activity className="size-3" />
                    <span>{statusInfo.displayStatus}</span>
                  </>
                )}
              </Badge>

              <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
                Current Cycle
              </Badge>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Day {currentDay}
              </span>
              <span className="text-sm text-muted-foreground">
                of cycle
              </span>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
              <Calendar className="size-3.5 text-muted-foreground/80" />
              <span>Cycle started {formatDate(currentCycle.start_date)}</span>
            </p>
          </div>

          <Link
            href={`/cycles/${currentCycle.id}`}
            className="size-10 flex items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-lavender hover:text-primary transition-all shrink-0"
            title="View cycle details"
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Cycle Progress Visualizer */}
        <div className="pt-1">
          <CycleProgressVisualizer
            currentDay={currentDay}
            expectedTotalDays={expectedCycleLength}
            periodDaysCount={periodDaysCount}
            isOnPeriod={statusInfo.isOnPeriod}
          />
        </div>

        {/* Additional Status Notice if no period days logged */}
        {periodDaysCount === 0 && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/50 border border-border/50 text-xs text-muted-foreground">
            <Droplets className="size-4 text-primary shrink-0" />
            <span>
              Tracking started on {formatDate(currentCycle.start_date)}. You can log period days whenever you are ready.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
