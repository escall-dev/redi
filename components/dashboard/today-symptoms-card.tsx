"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SymptomLogDialog } from "@/components/symptoms/symptom-log-dialog"
import { SymptomDeleteDialog } from "@/components/symptoms/symptom-delete-dialog"
import type { SymptomRecord } from "@/app/actions/symptoms"
import { getSeverityLabel } from "@/lib/symptoms/constants"
import { Activity, Plus, Pencil, Trash2 } from "lucide-react"

interface TodaySymptomsCardProps {
  todaySymptoms: SymptomRecord[]
  todayStr: string // YYYY-MM-DD
}

type SeverityBadgeVariant = "secondary" | "lavender" | "pink"

function severityBadgeVariant(severity: string): SeverityBadgeVariant {
  if (severity === "moderate") return "lavender"
  if (severity === "severe") return "pink"
  return "secondary"
}

export function TodaySymptomsCard({ todaySymptoms, todayStr }: TodaySymptomsCardProps) {
  const router = useRouter()
  const [logOpen, setLogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<SymptomRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<SymptomRecord | null>(null)

  const handleSuccess = () => router.refresh()

  return (
    <Card className="rounded-2xl border-border/70 shadow-redi-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="size-4 text-primary" />
            Today&apos;s Symptoms
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Log symptom"
            onClick={() => { setEditTarget(null); setLogOpen(true) }}
            className="text-muted-foreground hover:text-primary"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {todaySymptoms.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-5 space-y-3">
            <p className="text-sm text-muted-foreground">No symptoms logged today.</p>
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={() => { setEditTarget(null); setLogOpen(true) }}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              Add Symptom
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySymptoms.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50"
              >
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{s.symptom}</span>
                  <Badge
                    variant={severityBadgeVariant(s.severity)}
                    size="sm"
                    aria-label={`Severity: ${getSeverityLabel(s.severity)}`}
                  >
                    {getSeverityLabel(s.severity)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Edit ${s.symptom}`}
                    onClick={() => { setEditTarget(s); setLogOpen(true) }}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Delete ${s.symptom}`}
                    onClick={() => setDeleteTarget(s)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setEditTarget(null); setLogOpen(true) }}
              className="gap-1.5 text-muted-foreground hover:text-primary w-full justify-center"
            >
              <Plus className="size-3.5" />
              Add Another
            </Button>
          </div>
        )}
      </CardContent>

      <SymptomLogDialog
        open={logOpen}
        onOpenChange={(open) => { setLogOpen(open); if (!open) setEditTarget(null) }}
        symptomToEdit={editTarget}
        defaultDate={todayStr}
        onSuccess={handleSuccess}
      />

      {deleteTarget && (
        <SymptomDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          symptomId={deleteTarget.id}
          symptomName={deleteTarget.symptom}
          symptomSeverity={deleteTarget.severity}
          onSuccess={handleSuccess}
        />
      )}
    </Card>
  )
}
