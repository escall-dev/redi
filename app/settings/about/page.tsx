import { getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { AboutSettingsView } from "@/components/settings/about-settings-view"
import { Sparkles } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "About Seijun & Help | Seijun",
  description: "Learn about Seijun version, technology, privacy commitments, and answers to common questions.",
}

export default async function AboutSettingsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        badgeText="Support & About"
        badgeIcon={Sparkles}
        title="About Seijun"
        description="Version info, architecture, common questions, and terms of service."
      />
      <AboutSettingsView />
    </div>
  )
}
