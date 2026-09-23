import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function CyclesLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl shrink-0 self-start sm:self-auto" />
      </div>

      {/* Cycle Cards Skeleton List */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/80">
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-48 rounded-md" />
                    {i === 1 && <Skeleton className="h-4 w-24 rounded-full" />}
                  </div>
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
                <Skeleton className="size-5 rounded" />
              </div>

              {/* Metrics & period badges */}
              <div className="flex items-center gap-4 pt-1">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>

              {/* Period day dots */}
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <Skeleton key={dot} className="size-6 rounded-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
