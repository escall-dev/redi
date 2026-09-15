import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function CalendarSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 1. Main Calendar Card Skeleton */}
      <Card className="overflow-hidden">
        {/* Navigation & Header Controls */}
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-9 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-3.5 w-44 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-8 w-14 rounded-lg" />
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-5 space-y-4">
          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex justify-center py-1">
                <Skeleton className="h-3 w-8 rounded" />
              </div>
            ))}
          </div>

          {/* Monthly Day Grid (35 cells) */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-between min-h-[46px] sm:min-h-[52px] p-1.5 rounded-xl border border-transparent bg-secondary/30"
              >
                <div className="w-full flex items-center justify-between">
                  <Skeleton className="h-3.5 w-4 rounded" />
                </div>
                <Skeleton className="h-1.5 w-3 rounded-full" />
              </div>
            ))}
          </div>

          {/* Legend Skeleton */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Selected Date Card Skeleton */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-2">
              <Skeleton className="h-5 w-52 rounded-md" />
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>
  )
}
