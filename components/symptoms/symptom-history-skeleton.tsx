import { Skeleton } from "@/components/ui/skeleton"

export function SymptomHistorySkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3">
          {/* Date heading */}
          <Skeleton className="h-5 w-32 rounded-lg" />
          {/* Symptom rows */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/50">
            {[0, 1].map((j) => (
              <div key={j} className="flex items-center justify-between p-4 gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
