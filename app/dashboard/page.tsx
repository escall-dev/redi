import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCyclesForUser } from "@/app/actions/cycles"
import { getSymptomsByDateForUser } from "@/app/actions/symptoms"
import { getDailyNoteByDateForUser } from "@/app/actions/notes"
import {
  getCurrentCycle,
  getCurrentCycleStatus,
  getLatestPeriod,
  calculateAverageCycleLength,
  calculateAveragePeriodDuration,
  calculateEstimatedNextPeriod,
  getTodayDateString,
} from "@/lib/calculations/cycle-calculations"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SupporterBanner } from "@/components/dashboard/supporter-banner"
import { CurrentCycleCard } from "@/components/dashboard/current-cycle-card"
import { PeriodInsights } from "@/components/dashboard/period-insights"
import { CycleStatsSection } from "@/components/dashboard/cycle-stats-section"
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions"
import { RecentCyclesSection } from "@/components/dashboard/recent-cycles-section"
import { TodaySymptomsCard } from "@/components/dashboard/today-symptoms-card"
import { TodayNoteCard } from "@/components/dashboard/today-note-card"
import { NotificationPermissionPrompt } from "@/components/notifications/notification-permission-prompt"
import { resolveServerCycleContext } from "@/lib/cycle-context/server"
import { CycleContextSwitcher } from "@/components/cycle-context/cycle-context-switcher"
import { PartnerDashboardView } from "@/components/partner/partner-dashboard-view"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Dashboard",
  description: "Your personal cycle overview and insights.",
}

export default async function DashboardPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()
  const todayStr = getTodayDateString()

  // 1. Resolve authoritative cycle context (OWN vs PARTNER)
  const cycleContext = await resolveServerCycleContext(supabase, user.id)

  // 2. Fetch user profile for onboarding status and display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, last_period_start, typical_cycle_length, onboarding_completed, usage_role")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding")
  }

  const displayName = profile?.display_name || user.user_metadata?.display_name || "Friend"

  // Opportunistic evaluation of pending due reminders in the background
  try {
    const { processPendingNotificationEvents } = await import("@/lib/reminders/processor")
    void processPendingNotificationEvents({ userId: user.id })
  } catch {
    // Non-blocking
  }

  // ─── PARTNER CYCLE CONTEXT (Supporter Mode or Both-Role Partner Context) ───────
  if (cycleContext.isPartnerContext) {
    if (cycleContext.partnerInfo.hasActivePartner) {
      // Naturally present the connected Partner's cycle experience
      return <PartnerDashboardView isPrimaryDashboard={true} />
    }

    // Supporter account without active partner connection yet:
    // Present dedicated supporter connection setup instead of inappropriate personal cycle cards
    return (
      <div className="space-y-6 pb-8 max-w-4xl mx-auto">
        <DashboardHeader displayName={displayName} />
        <NotificationPermissionPrompt usageRole={profile?.usage_role} />
        <SupporterBanner hasActivePartner={false} />
      </div>
    )
  }

  // ─── OWN CYCLE CONTEXT (Cycle Tracker or Both-Role Own Context) ────────────────
  const typicalCycleLength = profile?.typical_cycle_length ?? 28
  const onboardingStartDate = profile?.last_period_start ?? null

  const [cycles, todaySymptoms, todayNote] = await Promise.all([
    getCyclesForUser(user.id, supabase),
    getSymptomsByDateForUser(user.id, todayStr, supabase),
    getDailyNoteByDateForUser(user.id, todayStr, supabase),
  ])

  // A. Current Cycle & Status
  const currentCycle = getCurrentCycle(cycles, todayStr)
  const statusInfo = getCurrentCycleStatus(currentCycle, todayStr)

  // B. Statistics
  const avgCycleLength = calculateAverageCycleLength(cycles)
  const avgPeriodDuration = calculateAveragePeriodDuration(cycles)
  const expectedCycleLength = avgCycleLength || typicalCycleLength || 28

  // C. Period Insights
  const latestPeriod = getLatestPeriod(cycles)
  const latestCycleStart = currentCycle?.start_date ?? onboardingStartDate
  const estimatedNextPeriod = calculateEstimatedNextPeriod({
    latestCycleStartDate: latestCycleStart,
    averageCycleLength: avgCycleLength,
    typicalCycleLength,
    referenceDateStr: todayStr,
  })

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      {/* Context Switcher for users with dual roles */}
      {cycleContext.canSwitchContext && <CycleContextSwitcher />}

      {/* Personalized Greeting Header */}
      <DashboardHeader displayName={displayName} />

      {/* Explanatory Notification Permission Prompt */}
      <NotificationPermissionPrompt usageRole={profile?.usage_role} />

      {/* Current Cycle Card with Progress Visualizer */}
      <CurrentCycleCard
        currentCycle={currentCycle}
        statusInfo={statusInfo}
        expectedCycleLength={expectedCycleLength}
      />

      {/* Period Insights: Last Period & Next Expected Period */}
      <PeriodInsights
        latestPeriod={latestPeriod}
        estimatedNextPeriod={estimatedNextPeriod}
        onboardingStartDate={onboardingStartDate}
      />

      {/* Quick Actions (Log Period dialog, Calendar, Cycles) */}
      <DashboardQuickActions />

      {/* Daily Observations: Today's Symptoms & Today's Daily Note */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TodaySymptomsCard todaySymptoms={todaySymptoms} todayStr={todayStr} />
        <TodayNoteCard todayNote={todayNote} todayStr={todayStr} />
      </div>

      {/* Cycle Summary Statistics */}
      <CycleStatsSection
        averageCycleLength={avgCycleLength}
        averagePeriodDuration={avgPeriodDuration}
        cyclesCount={cycles.length}
      />

      {/* Recent Cycle History */}
      <RecentCyclesSection
        cycles={cycles}
        currentCycleId={currentCycle?.id}
      />
    </div>
  )
}
