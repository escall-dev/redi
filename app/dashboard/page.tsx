import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Heart } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="lavender" className="gap-1 font-normal text-xs">
            <Sparkles className="size-3" />
            Home
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your daily overview and cycle insights will live here.
        </p>
      </div>

      {/* Placeholder Surface Card */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <Heart className="size-5" />
            </div>
            <div>
              <CardTitle>Welcome to Redi</CardTitle>
              <CardDescription>
                Phase 2C: Application Shell Active
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-secondary/60 p-4 border border-border/50 text-sm text-foreground/80 leading-relaxed">
            Your Redi dashboard will appear here once core tracking features are implemented in upcoming phases.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
