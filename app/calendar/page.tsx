import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCyclesAction } from "@/app/actions/cycles"
import { getSymptomsAction } from "@/app/actions/symptoms"
import { getDailyNotesAction } from "@/app/actions/notes"
import { CalendarView } from "@/components/calendar/calendar-view"
import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Calendar",
  description: "View and explore your menstrual cycle timeline and period tracking history.",
}

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Verify onboarding status
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .single()

  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding")
  }

  // Fetch verified user cycles with period days and consecutive cycle lengths
  const cycles = await getCyclesAction()

  // Fetch all symptoms for calendar indicator dots and selected-date context
  const symptoms = await getSymptomsAction()

  // Fetch all daily notes for calendar indicators and selected-date context
  const notes = await getDailyNotesAction()

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

