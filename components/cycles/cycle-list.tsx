"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CycleCard } from "@/components/cycles/cycle-card"
import { PeriodLogDialog } from "@/components/cycles/period-log-dialog"
import type { CycleRecord } from "@/app/actions/cycles"
import { Plus, History, Droplets } from "lucide-react"

interface CycleListProps {
  cycles: CycleRecord[]
}

export function CycleList({ cycles }: CycleListProps) {
  const router = useRouter()
  const [logOpen, setLogOpen] = React.useState(false)

  const handleSuccess = (cycleId?: string) => {
    router.refresh()
    if (cycleId) {
      router.push(`/cycles/${cycleId}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="lavender" className="gap-1 font-normal text-xs">
              <History className="size-3" />
              History & Tracking
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Cycle History
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Record, view, and manage your menstrual cycles and period days.
          </p>
        </div>

        <Button
          onClick={() => setLogOpen(true)}
          className="gap-2 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>Log Period</span>
        </Button>
      </div>

      {/* Cycle List or Empty State */}
      {cycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-border bg-card/50 space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-lavender text-primary border border-lavender-border/60">
            <Droplets className="size-7" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h2 className="text-lg font-semibold text-foreground">
              Your cycle history starts here
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Log your first period to begin tracking your cycle length, duration, and flow patterns.
            </p>
          </div>
          <Button onClick={() => setLogOpen(true)} className="gap-2 mt-2">
            <Plus className="size-4" />
            <span>Log Your First Period</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recorded Cycles ({cycles.length})
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {cycles.map((cycle, idx) => (
              <CycleCard
                key={cycle.id}
                cycle={cycle}
                isCurrent={idx === 0 && !cycle.end_date}
              />
            ))}
          </div>
        </div>
      )}

      {/* Log Period Modal */}
      <PeriodLogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
