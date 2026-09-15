import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getDailyNotesAction } from "@/app/actions/notes"
import { NotesHistory } from "@/components/notes/notes-history"
import { Badge } from "@/components/ui/badge"
import { BookOpen } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Daily Notes — Redi",
  description: "Private personal daily reflections and journal entries.",
}

export default async function NotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .single()

  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding")
  }

  const notes = await getDailyNotesAction()

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="space-y-1 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Badge variant="lavender" className="gap-1 font-normal text-xs">
            <BookOpen className="size-3 text-primary" />
            Daily Notes
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Daily Notes
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your private personal journal. Record thoughts, reminders, and daily observations.
        </p>
      </div>

      {/* Main Notes Timeline View */}
      <NotesHistory notes={notes} />
    </div>
  )
}
