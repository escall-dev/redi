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
import { deleteCycleAction } from "@/app/actions/cycles"
import { AlertTriangle, Loader2 } from "lucide-react"

interface DeleteCycleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cycleId: string
  onDeleted?: () => void
}

export function DeleteCycleDialog({
  open,
  onOpenChange,
  cycleId,
  onDeleted,
}: DeleteCycleDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      const result = await deleteCycleAction(cycleId)
      if (!result.success) {
        setError(result.error || "Failed to delete cycle.")
        setIsDeleting(false)
      } else {
        onOpenChange(false)
        onDeleted?.()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertTriangle className="size-5" />
            <DialogTitle className="text-destructive">Delete this cycle?</DialogTitle>
          </div>
          <DialogDescription className="text-foreground/80 leading-relaxed">
            This will permanently remove this cycle record and all of its associated period days.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <DialogFooter className="pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Yes, Delete Cycle"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
