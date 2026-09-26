import * as React from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HeartHandshake, Sparkles, ArrowRight, Eye } from "lucide-react"

export function SupporterBanner() {
  return (
    <Card className="border border-lavender-border/80 bg-gradient-to-br from-lavender/30 via-background to-card shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4 flex-1">
            <div className="size-12 rounded-2xl bg-lavender flex items-center justify-center text-primary shrink-0 border border-lavender-border/60 shadow-xs">
              <HeartHandshake className="size-6" />
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="lavender" className="gap-1.5 font-normal text-xs px-2.5 py-0.5">
                  <Sparkles className="size-3 text-primary" />
                  Supporter Account
                </Badge>
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                Partner Supporter View
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
                You are set up to support someone else&apos;s cycle. Access your partner&apos;s shared estimates,
                period logs, and shared daily notes in your dedicated Partner Dashboard.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            <Link
              href="/partner"
              className="inline-flex items-center justify-center w-full sm:w-auto h-9 px-4 rounded-xl gap-2 text-xs font-semibold cursor-pointer shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Eye className="size-3.5" />
              <span>Partner Dashboard</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
