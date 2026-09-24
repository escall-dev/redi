import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PartnerSettingsView } from "@/components/partner/partner-settings-view"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Partner Settings | Seijun",
  description: "Manage 1:1 partner connection, invitations, and sharing preferences.",
}

export default async function PartnerSettingsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login?redirect=/settings/partner")
  }

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding")
  }

  return <PartnerSettingsView />
}
