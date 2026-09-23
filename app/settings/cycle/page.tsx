import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { CycleSettingsForm, type CycleFormData } from "@/components/settings/cycle-settings-form"
import { CalendarHeart } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Cycle & Tracking Preferences | Seijun",
  description: "Configure your menstrual baseline cycle metrics, calculations, and tracking history.",
}

export default async function CycleSettingsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, sex, usage_role, typical_cycle_length, last_period_start, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding")
  }

  const initialData: CycleFormData = {
    typicalCycleLength: profile?.typical_cycle_length ?? 28,
    lastPeriodStart: profile?.last_period_start || "",
    usageRole: profile?.usage_role || null,
    displayName: profile?.display_name || user.user_metadata?.display_name || "",
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
    sex: profile?.sex || null,
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        badgeText="Cycle & Tracking"
        badgeIcon={CalendarHeart}
        title="Cycle Preferences"
        description="Configure your baseline cycle length and start dates to project your phases accurately."
      />
      <CycleSettingsForm initialData={initialData} />
    </div>
  )
}
