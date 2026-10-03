import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function PartnerLoading() {
  return (
    <div className="space-y-6 pb-8 max-w-2xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {/* Couple Card Skeleton */}
      <Card className="border-border/70 rounded-3xl overflow-hidden">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="size-12 rounded-full -ml-3" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </CardContent>
      </Card>

      {/* Affinity Skeleton */}
      <Card className="border-border/70 rounded-3xl">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-8 w-48 rounded" />
        </CardContent>
      </Card>

      {/* Shared Category Cards Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </div>
  )
}
