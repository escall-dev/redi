import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { ProfileSettingsForm, type ProfileFormData } from "@/components/settings/profile-settings-form"
import { User } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Profile Settings | Seijun",
  description: "Manage your display name, avatar, and personal account details.",
}

export default async function ProfileSettingsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, sex, usage_role, typical_cycle_length, last_period_start, onboarding_completed, created_at")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding")
  }

  const rawAvatar = profile?.avatar_url || user.user_metadata?.avatar_url || null
  const avatarUrl = rawAvatar && !rawAvatar.startsWith("preset:") ? rawAvatar : null

  const initialData: ProfileFormData = {
    displayName: profile?.display_name || user.user_metadata?.display_name || "",
    avatarUrl,
    sex: profile?.sex || (user.user_metadata?.sex as "male" | "female" | "prefer_not_to_say") || null,
    usageRole: profile?.usage_role || null,
    typicalCycleLength: profile?.typical_cycle_length ?? 28,
    lastPeriodStart: profile?.last_period_start || "",
    email: user.email || "",
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        badgeText="Account"
        badgeIcon={User}
        title="Profile & Avatar"
        description="Update your display identity, avatar photo, and account classification."
      />
      <ProfileSettingsForm initialData={initialData} />
    </div>
  )
}
