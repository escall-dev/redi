import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getDailyNotesForUser } from "@/app/actions/notes"
import { NotesHistory } from "@/components/notes/notes-history"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Users } from "lucide-react"
import { resolveServerCycleContext } from "@/lib/cycle-context/server"
import { CycleContextSwitcher } from "@/components/cycle-context/cycle-context-switcher"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Daily Notes",
  description: "Private personal daily reflections and journal entries.",
}

export default async function NotesPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()
  const cycleContext = await resolveServerCycleContext(supabase, user.id)

  // In partner context when daily notes are not shared, redirect to partner dashboard
  if (cycleContext.isPartnerContext && !cycleContext.permissions.hasDailyNotes) {
    redirect("/partner")
  }

  const targetUserId = cycleContext.isPartnerContext
    ? cycleContext.activeUserId
    : user.id

  const [profileRes, allNotes] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle(),
    getDailyNotesForUser(targetUserId, supabase),
  ])

  const profile = profileRes.data

  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding")
  }

  // When viewing own cycle, distinguish own personal notes from notes contributed by authorized partner
  const ownNotes = cycleContext.isPartnerContext
    ? []
    : allNotes.filter((n) => !n.author_id || n.author_id === user.id)

  const partnerNotes = cycleContext.isPartnerContext
    ? allNotes
    : allNotes.filter((n) => n.author_id && n.author_id !== user.id)

  return (
    <div className="space-y-6 pb-8">
      {/* Context Switcher for dual-role users */}
      {cycleContext.canSwitchContext && <CycleContextSwitcher />}

      {/* Page Header */}
      <div className="space-y-1 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Badge variant="lavender" className="gap-1 font-normal text-xs">
            {cycleContext.isPartnerContext ? (
              <>
                <Users className="size-3 text-primary" />
                Partner&apos;s Notes
              </>
            ) : (
              <>
                <BookOpen className="size-3 text-primary" />
                Daily Notes
              </>
            )}
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {cycleContext.isPartnerContext
            ? `${cycleContext.partnerInfo.displayName || "Partner"}'s Notes`
            : "Daily Notes"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {cycleContext.isPartnerContext
            ? `Daily reflections and notes recorded for ${cycleContext.partnerInfo.displayName || "your partner"}'s cycle.`
            : "Your private personal journal. Record thoughts, reminders, and daily observations."}
        </p>
      </div>

      {/* Main Notes Timeline View */}
      <NotesHistory
        notes={cycleContext.isPartnerContext ? allNotes : ownNotes}
        partnerNotes={partnerNotes}
        isPartnerContext={cycleContext.isPartnerContext}
        hasActivePartner={cycleContext.partnerInfo.hasActivePartner}
        partnerDisplayName={cycleContext.partnerInfo.displayName || "Partner"}
        canManage={
          cycleContext.isPartnerContext
            ? cycleContext.permissions.canManageDailyNotes
            : true
        }
        currentUserId={user.id}
      />
    </div>
  )
}
