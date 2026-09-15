import { SymptomHistorySkeleton } from "@/components/symptoms/symptom-history-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function SymptomsLoading() {
  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
      <SymptomHistorySkeleton />
    </div>
  )
}
