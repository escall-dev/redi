import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { PrivacySettingsView } from "@/components/settings/privacy-settings-view"
import { ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Privacy & Security | Seijun",
  description: "View account security, session details, cryptographic privacy, and account data policy.",
}

export default async function PrivacySettingsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("user_id", user.id)
    .maybeSingle()

  const email = user.email || ""
  const createdAt = profile?.created_at || user.created_at || ""

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        badgeText="Privacy & Security"
        badgeIcon={ShieldCheck}
        title="Privacy & Data Security"
        description="Manage your active session, view database encryption guarantees, and review data policy."
      />
      <PrivacySettingsView email={email} createdAt={createdAt} />
    </div>
  )
}
