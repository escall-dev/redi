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
import { deleteSymptomAction } from "@/app/actions/symptoms"
import { getSeverityLabel } from "@/lib/symptoms/constants"
import { Trash2, Loader2, AlertCircle } from "lucide-react"

interface SymptomDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  symptomId: string
  symptomName: string
  symptomSeverity: string
  onSuccess?: () => void
}

export function SymptomDeleteDialog({
  open,
  onOpenChange,
  symptomId,
  symptomName,
  symptomSeverity,
  onSuccess,
}: SymptomDeleteDialogProps) {
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)
    setIsPending(true)
    try {
      const result = await deleteSymptomAction(symptomId)
      if (!result.success) {
        setError(result.error ?? "Failed to delete. Please try again.")
      } else {
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setIsPending(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-5" />
            Delete Symptom
          </DialogTitle>
          <DialogDescription>
            This will permanently remove this symptom record. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-secondary/60 border border-border/60 p-3.5 text-sm space-y-1">
          <p className="font-semibold text-foreground">{symptomName}</p>
          <p className="text-muted-foreground capitalize">{getSeverityLabel(symptomSeverity)}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Delete Symptom"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
