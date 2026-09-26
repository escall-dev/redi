"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { recordPartnerPeriodAction } from "@/app/actions/partner-mutations"
import { AlertCircle, Check, Loader2 } from "lucide-react"

export interface ManagePeriodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerDisplayName?: string
  onSuccess?: () => void
}

/**
 * Seijun Phase 19.1: Partner Period Management Dialog
 *
 * Dedicated modal for supporters with `manage_period_status = true` to log
 * and update period entries for the connected Cycle Owner.
 * Targets the partner's cycle via `recordPartnerPeriodAction()`.
 * Never modifies the supporter's personal cycle records.
 */
export function ManagePeriodDialog({
  open,
  onOpenChange,
  partnerDisplayName,
  onSuccess,
}: ManagePeriodDialogProps) {
  const todayStr = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = React.useState(todayStr)
  const [endDate, setEndDate] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setStartDate(new Date().toISOString().split("T")[0])
      setEndDate("")
      setErrorMsg(null)
      setSuccess(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)
    setSuccess(false)

    try {
      const res = await recordPartnerPeriodAction({
        startDate,
        endDate: endDate ? endDate : null,
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          onSuccess?.()
          setSuccess(false)
        }, 800)
      } else {
        setErrorMsg(res.error || "Failed to log period.")
      }
    } catch {
      setErrorMsg("Network error saving period record.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold">
            Manage Partner Period
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Record period start and optional end date for {partnerDisplayName || "partner"}.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="flex items-center justify-center py-6 gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
            <Check className="size-4" />
            <span>Period recorded successfully!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Period Start Date</Label>
              <Input
                type="date"
                max={todayStr}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Period End Date (Optional)</Label>
              <Input
                type="date"
                max={todayStr}
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Leave empty if period is currently ongoing.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
                className="flex-1 h-10 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !startDate}
                className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Record Period</span>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
