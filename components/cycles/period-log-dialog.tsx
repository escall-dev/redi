"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import {
  createCycleAction,
  updateCycleAction,
  type CycleRecord,
} from "@/app/actions/cycles"
import { Calendar, Clock, AlertCircle, Loader2 } from "lucide-react"

interface PeriodLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cycleToEdit?: CycleRecord | null
  onSuccess?: (cycleId?: string) => void
}

function calculateInclusiveDays(startStr: string, endStr: string): number {
  const start = new Date(startStr + "T00:00:00")
  const end = new Date(endStr + "T00:00:00")
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1
}

interface PeriodLogFormProps {
  cycleToEdit?: CycleRecord | null
  onClose: () => void
  onSuccess?: (cycleId?: string) => void
}

function PeriodLogForm({ cycleToEdit, onClose, onSuccess }: PeriodLogFormProps) {
  const isEditing = Boolean(cycleToEdit)
  const todayStr = new Date().toISOString().split("T")[0]

  const [startDate, setStartDate] = React.useState(
    cycleToEdit?.start_date || todayStr
  )
  const [hasEnded, setHasEnded] = React.useState(
    Boolean(cycleToEdit?.end_date)
  )
  const [endDate, setEndDate] = React.useState(cycleToEdit?.end_date || "")
  const [notes, setNotes] = React.useState(cycleToEdit?.notes || "")
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  // Real-time period duration calculation
  let calculatedDuration: number | null = null
  if (startDate && hasEnded && endDate && endDate >= startDate) {
    calculatedDuration = calculateInclusiveDays(startDate, endDate)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!startDate) {
      setError("Please select a period start date.")
      return
    }

    if (startDate > todayStr) {
      setError("Period start date cannot be in the future.")
      return
    }

    if (hasEnded && !endDate) {
      setError("Please select an end date or uncheck 'Period has ended'.")
      return
    }

    if (hasEnded && endDate) {
      if (endDate > todayStr) {
        setError("Period end date cannot be in the future.")
        return
      }
      if (endDate < startDate) {
        setError("Period end date cannot precede the start date.")
        return
      }
    }

    const formData = new FormData()
    formData.append("startDate", startDate)
    if (hasEnded && endDate) {
      formData.append("endDate", endDate)
    }
    if (notes.trim()) {
      formData.append("notes", notes.trim())
    }

    setIsPending(true)
    try {
      let result
      if (isEditing && cycleToEdit) {
        result = await updateCycleAction(cycleToEdit.id, null, formData)
      } else {
        result = await createCycleAction(null, formData)
      }

      if (!result.success) {
        setError(result.error || "Failed to save cycle. Please check your dates.")
      } else {
        onClose()
        onSuccess?.(result.cycleId)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Start Date */}
      <div className="space-y-1.5">
        <Label htmlFor="periodStartDate">Period Start Date *</Label>
        <DatePicker
          id="periodStartDate"
          value={startDate}
          onChange={setStartDate}
          maxDate={todayStr}
          placeholder="Select start date"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          First day of bleeding for this cycle.
        </p>
      </div>

      {/* Has Ended Toggle */}
      <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-3 border border-border/60">
        <div>
          <p className="text-sm font-medium text-foreground">Period has ended</p>
          <p className="text-xs text-muted-foreground">
            Turn on if bleeding has finished
          </p>
        </div>
        <input
          type="checkbox"
          id="hasEnded"
          checked={hasEnded}
          onChange={(e) => {
            setHasEnded(e.target.checked)
            if (!e.target.checked) {
              setEndDate("")
            } else if (!endDate && startDate) {
              setEndDate(startDate)
            }
          }}
          disabled={isPending}
          className="size-5 rounded border-border text-primary accent-primary cursor-pointer"
        />
      </div>

      {/* End Date (Conditional) */}
      {hasEnded && (
        <div className="space-y-1.5 animate-in fade-in-50 duration-150">
          <Label htmlFor="periodEndDate">Period End Date *</Label>
          <DatePicker
            id="periodEndDate"
            value={endDate}
            onChange={setEndDate}
            maxDate={todayStr}
            placeholder="Select end date"
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Last day of bleeding for this cycle.
          </p>
        </div>
      )}

      {/* Duration Preview */}
      {calculatedDuration !== null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lavender text-primary text-xs font-medium border border-lavender-border/60">
          <Clock className="size-3.5" />
          <span>Calculated Period Duration: {calculatedDuration} days</span>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="cycleNotes">Notes (Optional)</Label>
        <textarea
          id="cycleNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Started in the morning, heavier on day 2..."
          disabled={isPending}
          rows={3}
          className="w-full rounded-xl border border-border/80 bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 transition-all resize-none"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Saving...
            </>
          ) : isEditing ? (
            "Save Changes"
          ) : (
            "Save Period"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function PeriodLogDialog({
  open,
  onOpenChange,
  cycleToEdit,
  onSuccess,
}: PeriodLogDialogProps) {
  const isEditing = Boolean(cycleToEdit)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            <span>{isEditing ? "Edit Cycle Period" : "Log Period"}</span>
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update cycle dates or notes. Period days will automatically reconcile."
              : "Record your period start and end dates to track your cycle pattern."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <PeriodLogForm
            key={cycleToEdit?.id || "new-log"}
            cycleToEdit={cycleToEdit}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
