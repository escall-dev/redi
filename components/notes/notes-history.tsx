"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { NoteEditorDialog } from "@/components/notes/note-editor-dialog"
import { NoteDeleteDialog } from "@/components/notes/note-delete-dialog"
import type { DailyNoteRecord } from "@/app/actions/notes"
import { BookOpen, Plus, Pencil, Trash2, Calendar, ChevronDown, ChevronUp } from "lucide-react"

interface NotesHistoryProps {
  notes: DailyNoteRecord[]
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

const TRUNCATE_LENGTH = 300

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: DailyNoteRecord
  onEdit: (note: DailyNoteRecord) => void
  onDelete: (note: DailyNoteRecord) => void
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const isLong = note.content.length > TRUNCATE_LENGTH
  const displayContent = isLong && !isExpanded
    ? `${note.content.slice(0, TRUNCATE_LENGTH)}...`
    : note.content

  return (
    <Card className="hover:border-primary/40 transition-all">
      <CardHeader className="pb-2.5 pt-4 px-4 sm:px-5 border-b border-border/40">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
            <Calendar className="size-4 text-primary shrink-0" />
            <span>{formatDate(note.date)}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Edit note for ${note.date}`}
              onClick={() => onEdit(note)}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Delete note for ${note.date}`}
              onClick={() => onDelete(note)}
              className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-3">
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
          {displayContent}
        </p>

        {isLong && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="h-7 px-2 text-xs font-medium text-primary hover:text-primary/80 hover:bg-lavender/50 gap-1"
          >
            {isExpanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="size-3" />
              </>
            ) : (
              <>
                <span>Read more</span>
                <ChevronDown className="size-3" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function NotesHistory({ notes }: NotesHistoryProps) {
  const router = useRouter()
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<DailyNoteRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<DailyNoteRecord | null>(null)

  const handleOpenCreate = () => {
    setEditTarget(null)
    setEditorOpen(true)
  }

  const handleEdit = (note: DailyNoteRecord) => {
    setEditTarget(note)
    setEditorOpen(true)
  }

  const handleDelete = (note: DailyNoteRecord) => {
    setDeleteTarget(note)
  }

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header action row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Journal Entries
          </h2>
          <p className="text-xs text-muted-foreground">
            {notes.length === 1 ? "1 note recorded" : `${notes.length} notes recorded`}
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenCreate}
          size="sm"
          className="gap-1.5 rounded-xl shadow-redi-sm"
        >
          <Plus className="size-4" />
          <span>Write Note</span>
        </Button>
      </div>

      {/* Notes List or Empty State */}
      {notes.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-border/80 p-8 sm:p-12 text-center bg-card/50">
          <div className="flex flex-col items-center justify-center space-y-3 max-w-xs mx-auto">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-lavender text-primary border border-lavender-border/70">
              <BookOpen className="size-7" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">
                Nothing written yet.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Add a note whenever you&apos;d like to remember how your day went.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleOpenCreate}
              className="gap-1.5 rounded-xl shadow-redi-sm pt-1"
            >
              <Plus className="size-4" />
              <span>Write Your First Note</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Note Editor Modal */}
      <NoteEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        noteToEdit={editTarget}
        existingNotes={notes}
        onSuccess={handleSuccess}
      />

      {/* Note Delete Confirmation Modal */}
      <NoteDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        note={deleteTarget}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
