import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, TrendingUp } from "lucide-react"

export default function CyclesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="lavender" className="gap-1 font-normal text-xs">
            <TrendingUp className="size-3" />
            History
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Cycle History
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Log of past cycles, trends, and patterns.
        </p>
      </div>

      {/* Placeholder Surface Card */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <History className="size-5" />
            </div>
            <div>
              <CardTitle>History & Patterns</CardTitle>
              <CardDescription>
                Placeholder Route
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-secondary/60 p-4 border border-border/50 text-sm text-foreground/80 leading-relaxed">
            Your Redi cycle history and trends will appear here.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
