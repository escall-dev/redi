"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NoteEditorDialog } from "@/components/notes/note-editor-dialog"
import type { DailyNoteRecord } from "@/app/actions/notes"
import { BookOpen, Plus, Pencil, ArrowRight } from "lucide-react"

interface TodayNoteCardProps {
  todayNote: DailyNoteRecord | null
  todayStr: string // YYYY-MM-DD
}

export function TodayNoteCard({ todayNote, todayStr }: TodayNoteCardProps) {
  const router = useRouter()
  const [editorOpen, setEditorOpen] = React.useState(false)

  const handleSuccess = () => router.refresh()

  return (
    <Card className="rounded-2xl border-border/70 shadow-redi-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="size-4 text-primary" />
            Today&apos;s Note
          </CardTitle>

          <div className="flex items-center gap-1">
            {todayNote ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Edit today's note"
                onClick={() => setEditorOpen(true)}
                className="text-muted-foreground hover:text-primary"
              >
                <Pencil className="size-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Write today's note"
                onClick={() => setEditorOpen(true)}
                className="text-muted-foreground hover:text-primary"
              >
                <Plus className="size-4" />
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
              onClick={() => setEditorOpen(true)}
              className="gap-1.5 rounded-xl border-border/80 hover:bg-lavender/50 hover:text-primary"
            >
              <Plus className="size-3.5" />
              <span>Add a note</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-secondary/40 p-3.5 border border-border/50">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-3">
                &ldquo;{todayNote.content}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditorOpen(true)}
                className="h-7 px-2 text-xs text-primary hover:text-primary/80 gap-1"
              >
                <Pencil className="size-3" />
                <span>Edit Note</span>
              </Button>

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
        noteToEdit={todayNote}
        defaultDate={todayStr}
        onSuccess={handleSuccess}
      />
    </Card>
  )
}
