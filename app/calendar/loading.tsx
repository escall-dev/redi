import { CalendarSkeleton } from "@/components/calendar/calendar-skeleton"

export default function CalendarLoading() {
  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 bg-lavender/60 rounded-full animate-pulse" />
        </div>
        <div className="h-8 w-44 bg-secondary rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-secondary/70 rounded-md animate-pulse" />
      </div>

      <CalendarSkeleton />
    </div>
  )
}
