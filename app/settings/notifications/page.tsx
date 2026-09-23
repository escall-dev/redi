import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { NotificationPreferencesCard } from "@/components/settings/notification-preferences"
import { PushTestCard } from "@/components/settings/push-test-card"
import { getNotificationPreferences } from "@/lib/server/notification-preferences"
import { BellRing } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Notification Settings | Seijun",
  description: "Customize push reminders, period timing alerts, and delivery preferences.",
}

export default async function NotificationsSettingsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()

  const [profileRes, initialPreferences] = await Promise.all([
    supabase
      .from("profiles")
      .select("usage_role, onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle(),
    getNotificationPreferences(user.id),
  ])

  const profile = profileRes.data

  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding")
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <SettingsPageHeader
        badgeText="Notifications"
        badgeIcon={BellRing}
        title="Notification Preferences"
        description="Control push notifications, cycle alert timings, and delivery status across your devices."
      />

      {/* Notification Categories & Timing */}
      <NotificationPreferencesCard
        initialPreferences={initialPreferences}
        usageRole={profile?.usage_role}
      />

      {/* Web Push Device Diagnostics */}
      <PushTestCard />
    </div>
  )
}
