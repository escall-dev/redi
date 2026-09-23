import { getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { AppearanceSettingsView } from "@/components/settings/appearance-settings-view"
import { SunMoon } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Appearance & Theme | Seijun",
  description: "Personalize theme modes, contrast, and visual display options.",
}

export default async function AppearanceSettingsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        badgeText="Appearance"
        badgeIcon={SunMoon}
        title="Theme & Display"
        description="Choose light, dark, or system mode and tune visual comfort settings."
      />
      <AppearanceSettingsView />
    </div>
  )
}
