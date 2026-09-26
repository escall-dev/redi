import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HeartHandshake, Sparkles } from "lucide-react"

export function SupporterBanner() {
  return (
    <Card className="border border-lavender-border/80 bg-gradient-to-br from-lavender/30 via-background to-card shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="size-12 rounded-2xl bg-lavender flex items-center justify-center text-primary shrink-0 border border-lavender-border/60 shadow-xs">
            <HeartHandshake className="size-6" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="lavender" className="gap-1.5 font-normal text-xs px-2.5 py-0.5">
                <Sparkles className="size-3 text-primary" />
                Supporter Account
              </Badge>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
              Partner Connection Coming Soon
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              You are set up to support someone else&apos;s cycle. In an upcoming phase, you&apos;ll be able to
              link directly with your partner or friend to view and help manage their menstrual records.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
