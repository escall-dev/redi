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
import { deleteDailyNoteAction, type DailyNoteRecord } from "@/app/actions/notes"
import { Trash2, AlertCircle, Loader2 } from "lucide-react"

interface NoteDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: DailyNoteRecord | null
  onSuccess?: () => void
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function NoteDeleteContent({
  note,
  onClose,
  onSuccess,
}: {
  note: DailyNoteRecord
  onClose: () => void
  onSuccess?: () => void
}) {
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  const handleDelete = async () => {
    setError(null)
    setIsPending(true)
    try {
      const result = await deleteDailyNoteAction(note.id)
      if (!result.success) {
        setError(result.error || "Failed to delete note.")
      } else {
        onClose()
        onSuccess?.()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setIsPending(false)
    }
  }

  const preview =
    note.content.length > 80 ? `${note.content.slice(0, 80)}...` : note.content

  return (
    <>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 space-y-1 text-xs sm:text-sm">
        <p className="font-semibold text-foreground">
          {formatDate(note.date)}
        </p>
        <p className="text-muted-foreground italic">&ldquo;{preview}&rdquo;</p>
      </div>

      <DialogFooter className="pt-2 gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
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
            "Delete Note"
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

export function NoteDeleteDialog({
  open,
  onOpenChange,
  note,
  onSuccess,
}: NoteDeleteDialogProps) {
  if (!note) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
              <Trash2 className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Delete Daily Note?
              </DialogTitle>
              <DialogDescription className="text-xs">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {open && (
          <NoteDeleteContent
            key={note.id}
            note={note}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
