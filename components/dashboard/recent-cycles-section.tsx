import * as React from "react"
import Link from "next/link"
import { CycleCard } from "@/components/cycles/cycle-card"
import type { CycleRecord } from "@/app/actions/cycles"
import { ArrowRight } from "lucide-react"

interface RecentCyclesSectionProps {
  cycles: CycleRecord[]
  currentCycleId?: string
}

export function RecentCyclesSection({
  cycles,
  currentCycleId,
}: RecentCyclesSectionProps) {
  const recentCycles = cycles.slice(0, 3)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Cycles</h3>
        {cycles.length > 0 && (
          <Link
            href="/cycles"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            <span>View all ({cycles.length})</span>
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>

      {recentCycles.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-border bg-card/50 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">No cycle history yet</p>
          <p className="text-xs text-muted-foreground">
            Your recorded cycles will appear here. Start by logging your current or past period.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentCycles.map((cycle) => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              isCurrent={cycle.id === currentCycleId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
