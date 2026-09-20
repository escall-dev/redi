import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { SettingsForm, type ProfileSettingsData } from "@/components/settings/settings-form"
import { Sliders } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Settings",
  description: "Manage your profile, cycle preferences, and private data.",
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, typical_cycle_length, last_period_start, onboarding_completed, created_at")
    .eq("user_id", user.id)
    .single()

  // Onboarding guard: incomplete users must complete onboarding first
  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding")
  }

  const rawAvatar = profile?.avatar_url || user.user_metadata?.avatar_url || null
  const avatarUrl = rawAvatar && !rawAvatar.startsWith("preset:") ? rawAvatar : null

  const initialData: ProfileSettingsData = {
    displayName: profile?.display_name || user.user_metadata?.display_name || "",
    avatarUrl,
    typicalCycleLength: profile?.typical_cycle_length ?? 28,
    lastPeriodStart: profile?.last_period_start || "",
    email: user.email || "",
    createdAt: profile?.created_at || user.created_at || "",
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Badge variant="lavender" className="gap-1.5 font-normal text-xs px-2.5 py-0.5">
            <Sliders className="size-3 text-primary" />
            Preferences & Account
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Manage your personal profile, baseline cycle calculations, and account details.
        </p>
      </div>

      {/* Main Settings Form */}
      <SettingsForm initialData={initialData} />
    </div>
  )
}
