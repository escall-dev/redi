"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, RotateCcw } from "lucide-react"

interface CalendarErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function CalendarError({ reset }: CalendarErrorProps) {
  return (
    <div className="space-y-6 max-w-xl mx-auto py-8">
      <Card className="border-border/80 shadow-redi-sm">
        <CardContent className="p-6 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive-soft text-destructive border border-destructive/20">
            <AlertCircle className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground">
              Unable to load calendar
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We encountered an issue loading your cycle and period timeline.
              Please check your connection or try again.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              className="gap-2 text-sm rounded-xl border-border/80 hover:bg-lavender/60 hover:text-primary"
            >
              <RotateCcw className="size-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
