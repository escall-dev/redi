import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { Sparkles, Calendar, Clock, ArrowRight, Settings } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  let displayName = "Friend"
  let typicalCycleLength: number | null = 28
  let lastPeriodStart: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      displayName = user.user_metadata?.display_name || "Friend"
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, last_period_start, typical_cycle_length")
        .eq("user_id", user.id)
        .single()

      if (profile?.display_name) {
        displayName = profile.display_name
      }
      if (profile?.typical_cycle_length) {
        typicalCycleLength = profile.typical_cycle_length
      }
      if (profile?.last_period_start) {
        lastPeriodStart = profile.last_period_start
      }
    }
  } catch {
    // Graceful fallback
  }

  const formattedPeriodDate = lastPeriodStart
    ? new Date(lastPeriodStart + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not logged yet"

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
          Hello, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your personalized cycle overview is ready.
        </p>
      </div>

      {/* Onboarding Profile Summary Card */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
                <Sparkles className="size-5" />
              </div>
              <div>
                <CardTitle>Cycle Setup Completed</CardTitle>
                <CardDescription>
                  Your preferences are saved and active
                </CardDescription>
              </div>
            </div>
            <Badge variant="lavender" className="text-xs">
              Phase 6 Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex size-9 items-center justify-center rounded-lg bg-lavender text-primary">
                <Calendar className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Period Started</p>
                <p className="text-sm font-semibold text-foreground">{formattedPeriodDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex size-9 items-center justify-center rounded-lg bg-lavender text-primary">
                <Clock className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Typical Cycle</p>
                <p className="text-sm font-semibold text-foreground">{typicalCycleLength} days</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Full cycle predictions, calendar tracking, and daily logging will be introduced in the upcoming phases.
          </p>
        </CardContent>
      </Card>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/calendar"
          className="group block p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-xs transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar className="size-4 text-primary" />
              <span className="text-sm font-medium text-foreground">View Calendar</span>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Inspect cycle dates and month view placeholder.
          </p>
        </Link>

        <Link
          href="/settings"
          className="group block p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-xs transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Settings className="size-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Preferences & Account</span>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Manage your profile details and session security.
          </p>
        </Link>
      </div>
    </div>
  )
}
