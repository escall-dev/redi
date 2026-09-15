"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function SymptomsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 space-y-4">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="size-7" />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-foreground">Something went wrong</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          We could not load your symptoms. Please try again.
        </p>
      </div>
      <Button onClick={reset} variant="soft">Try Again</Button>
    </div>
  )
}
