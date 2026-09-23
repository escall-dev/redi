import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function CycleDetailLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      {/* Back Link & Quick Actions */}
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-28 rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-18 rounded-lg" />
        </div>
      </div>

      {/* Cycle Header */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded-md" />
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/80">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-20 rounded" />
                <Skeleton className="h-5 w-24 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Period Days Section */}
      <Card className="border-border/80">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>

          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
