import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-8 w-60 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {/* Current Cycle Card Skeleton */}
      <Card className="border-border/80">
        <CardContent className="p-6 sm:p-7 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-9 w-40 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
            <Skeleton className="size-10 rounded-xl" />
          </div>

          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Insights Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border/80">
          <CardContent className="p-5 sm:p-6 space-y-3">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-7 w-48 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-5 sm:p-6 space-y-3">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-7 w-48 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-18 rounded-2xl" />
          <Skeleton className="h-18 rounded-2xl" />
          <Skeleton className="h-18 rounded-2xl" />
        </div>
      </div>

      {/* Cycle Statistics Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
