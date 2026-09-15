import { NotesHistorySkeleton } from "@/components/notes/notes-history-skeleton"

export default function NotesLoading() {
  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-1 max-w-2xl mx-auto">
        <div className="h-5 w-24 bg-secondary rounded-md animate-pulse" />
        <div className="h-8 w-44 bg-secondary rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-secondary rounded-md animate-pulse" />
      </div>

      <NotesHistorySkeleton />
    </div>
  )
}
