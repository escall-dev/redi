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
import { deletePartnerDailyNoteAction } from "@/app/actions/partner-mutations"
import { Trash2, AlertCircle, Loader2 } from "lucide-react"

interface NoteDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: DailyNoteRecord | null
  isPartnerContext?: boolean
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

function formatPostingTime(isoString?: string): string {
  if (!isoString) return ""
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  } catch {
    return ""
  }
}

function NoteDeleteContent({
  note,
  isPartnerContext = false,
  onClose,
  onSuccess,
}: {
  note: DailyNoteRecord
  isPartnerContext?: boolean
  onClose: () => void
  onSuccess?: () => void
}) {
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  const handleDelete = async () => {
    setError(null)
    setIsPending(true)
    try {
      if (isPartnerContext) {
        const result = await deletePartnerDailyNoteAction({ noteId: note.id })
        if (!result.ok) {
          setError(result.error || "Failed to delete note.")
        } else {
          onClose()
          onSuccess?.()
        }
      } else {
        const result = await deleteDailyNoteAction(note.id)
        if (!result.success) {
          setError(result.error || "Failed to delete note.")
        } else {
          onClose()
          onSuccess?.()
        }
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
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground">
            {formatDate(note.date)}
          </p>
          {note.created_at && (
            <span className="text-[11px] text-muted-foreground font-mono">
              {formatPostingTime(note.created_at)}
            </span>
          )}
        </div>
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
  isPartnerContext = false,
  onSuccess,
}: NoteDeleteDialogProps) {
  if (!note) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
              <Trash2 className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Delete Daily Note
              </DialogTitle>
              <DialogDescription className="text-xs">
                This single journal entry will be permanently removed. Other notes for this date will not be affected.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <NoteDeleteContent
          key={note.id}
          note={note}
          isPartnerContext={isPartnerContext}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
