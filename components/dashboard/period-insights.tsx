import * as React from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { LatestPeriodInfo, EstimatedNextPeriod } from "@/lib/calculations/cycle-calculations"
import { Droplet, Calendar, Clock, ArrowRight } from "lucide-react"

interface PeriodInsightsProps {
  latestPeriod: LatestPeriodInfo | null
  estimatedNextPeriod: EstimatedNextPeriod | null
  onboardingStartDate?: string | null
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

export function PeriodInsights({
  latestPeriod,
  estimatedNextPeriod,
  onboardingStartDate,
}: PeriodInsightsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* 1. Last Period Card */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
                <Droplet className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Last Period</h3>
                <p className="text-xs text-muted-foreground">Recorded flow</p>
              </div>
            </div>
            {latestPeriod && (
              <Badge variant="lavender" className="text-[11px] font-normal px-2 py-0.5">
                {latestPeriod.isOngoing ? "Ongoing" : "Completed"}
              </Badge>
            )}
          </div>

          {latestPeriod ? (
            <div className="space-y-2 pt-1">
              <div className="text-lg font-semibold text-foreground">
                {latestPeriod.endDate
                  ? `${formatDate(latestPeriod.startDate)} – ${formatDate(latestPeriod.endDate)}`
                  : `${formatDate(latestPeriod.startDate)} (Ongoing)`}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {latestPeriod.duration ? (
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    <Droplet className="size-3" />
                    {latestPeriod.duration} days duration
                  </span>
                ) : (
                  <span>{latestPeriod.periodDaysCount} period days logged</span>
                )}
              </div>

              <div className="pt-2">
                <Link
                  href={`/cycles/${latestPeriod.cycleId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <span>View cycle record</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium text-foreground">No period logged yet</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {onboardingStartDate
                  ? `Your tracking started on ${formatDate(onboardingStartDate)}. Log your period days whenever you're ready.`
                  : "Start logging your period days to record duration and flow."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Next Expected Period Card */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
                <Calendar className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Next Expected Period</h3>
                <p className="text-xs text-muted-foreground">Estimated timeframe</p>
              </div>
            </div>

            <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground px-2 py-0.5">
              Estimate
            </Badge>
          </div>

          {estimatedNextPeriod ? (
            <div className="space-y-2 pt-1">
              <div className="text-lg font-semibold text-foreground">
                {formatDate(estimatedNextPeriod.estimatedStartDate)}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3 text-muted-foreground/70" />
                <span>
                  {estimatedNextPeriod.daysUntil > 0
                    ? `In approximately ${estimatedNextPeriod.daysUntil} days`
                    : estimatedNextPeriod.daysUntil === 0
                    ? "Expected around today"
                    : `Approximately ${Math.abs(estimatedNextPeriod.daysUntil)} days ago`}
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground/80 pt-1 leading-relaxed">
                {estimatedNextPeriod.isFallback
                  ? `Based on your typical ${estimatedNextPeriod.cycleLengthUsed}-day cycle from setup.`
                  : `Based on your average ${estimatedNextPeriod.cycleLengthUsed}-day cycle history.`}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium text-foreground">Keep tracking</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As you record more cycle starts, Redi will calculate your estimated next period window.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
