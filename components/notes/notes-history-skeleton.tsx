import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function NotesHistorySkeleton() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header controls skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-8 w-44 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Note cards skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-2xl border-border/70 shadow-redi-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-36 rounded-md" />
                <div className="flex items-center gap-1">
                  <Skeleton className="size-7 rounded-lg" />
                  <Skeleton className="size-7 rounded-lg" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
