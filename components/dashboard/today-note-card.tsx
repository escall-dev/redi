"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NoteEditorDialog } from "@/components/notes/note-editor-dialog"
import type { DailyNoteRecord } from "@/app/actions/notes"
import { BookOpen, Plus, Pencil, ArrowRight, Clock } from "lucide-react"

interface TodayNoteCardProps {
  todayNote: DailyNoteRecord | null
  todayStr: string // YYYY-MM-DD
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

export function TodayNoteCard({ todayNote, todayStr }: TodayNoteCardProps) {
  const router = useRouter()
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [noteToEdit, setNoteToEdit] = React.useState<DailyNoteRecord | null>(null)

  const handleSuccess = () => router.refresh()

  const handleWriteNew = () => {
    setNoteToEdit(null)
    setEditorOpen(true)
  }

  const handleEdit = () => {
    setNoteToEdit(todayNote)
    setEditorOpen(true)
  }

  const postingTime = formatPostingTime(todayNote?.created_at)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="size-4 text-primary" />
            Today&apos;s Note
          </CardTitle>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Write a note for today"
              onClick={handleWriteNew}
              className="text-muted-foreground hover:text-primary cursor-pointer"
            >
              <Plus className="size-4" />
            </Button>
            {todayNote && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Edit today's note"
                onClick={handleEdit}
                className="text-muted-foreground hover:text-primary cursor-pointer"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!todayNote ? (
          <div className="flex flex-col items-center justify-center text-center py-4 space-y-2.5">
            <p className="text-sm text-muted-foreground">No note for today.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWriteNew}
              className="gap-1.5 rounded-xl border-border/80 hover:bg-lavender/50 hover:text-primary cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add a note</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-secondary/40 p-3.5 border border-border/50 space-y-2">
              {postingTime && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground font-mono">
                  <Clock className="size-3 text-primary" />
                  <span>Posted at {postingTime}</span>
                </div>
              )}
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-3">
                &ldquo;{todayNote.content}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleWriteNew}
                  className="h-7 px-2 text-xs text-primary hover:text-primary/80 gap-1 cursor-pointer"
                >
                  <Plus className="size-3" />
                  <span>Add another</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                >
                  <Pencil className="size-3" />
                  <span>Edit</span>
                </Button>
              </div>

              <Link
                href="/notes"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                <span>View all notes</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        )}
      </CardContent>

      <NoteEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        noteToEdit={noteToEdit}
        defaultDate={todayStr}
        onSuccess={handleSuccess}
      />
    </Card>
  )
}
