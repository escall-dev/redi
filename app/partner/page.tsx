import { getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PartnerDashboardView } from "@/components/partner/partner-dashboard-view"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Partner Dashboard | Seijun",
  description: "View shared cycle data from your connected partner.",
}

export default async function PartnerDashboardPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login?redirect=/partner")
  }

  return <PartnerDashboardView />
}
