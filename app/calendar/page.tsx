import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCyclesForUser } from "@/app/actions/cycles"
import { getSymptomsForUser } from "@/app/actions/symptoms"
import { getDailyNotesForUser } from "@/app/actions/notes"
import { CalendarView } from "@/components/calendar/calendar-view"
import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Calendar",
  description: "View and explore your menstrual cycle timeline and period tracking history.",
}

export default async function CalendarPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()

  // Concurrently execute independent calendar dataset queries
  const [profileRes, cycles, symptoms, notes] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle(),
    getCyclesForUser(user.id, supabase),
    getSymptomsForUser(user.id, supabase),
    getDailyNotesForUser(user.id, supabase),
  ])

  const profile = profileRes.data

  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding")
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="lavender" className="gap-1 font-normal text-xs">
            <CalendarDays className="size-3" />
            Calendar
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Calendar
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Menstrual cycle timeline and period tracking history.
        </p>
      </div>

      {/* Main Interactive Calendar View */}
      <CalendarView cycles={cycles} symptoms={symptoms} notes={notes} />
    </div>
  )
}

