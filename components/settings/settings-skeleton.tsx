import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>

      {/* Card 1: Profile Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Cycle Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-4 w-56 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Account & Session */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-4 w-52 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </CardContent>
        <CardFooter className="flex justify-end pt-2 border-t border-border/50">
          <Skeleton className="h-10 w-28 rounded-xl" />
        </CardFooter>
      </Card>

      {/* Card 4: Danger Zone */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-4 w-60 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full rounded-xl" />
        </CardContent>
      </Card>

      {/* Save Button Skeleton */}
      <div className="flex justify-end pt-2">
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
    </div>
  )
}
