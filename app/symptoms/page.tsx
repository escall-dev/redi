import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getSymptomsForUser } from "@/app/actions/symptoms"
import { SymptomHistory } from "@/components/symptoms/symptom-history"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Symptoms",
  description: "Record and review your personal symptom observations.",
}

export default async function SymptomsPage() {
  const user = await getAuthenticatedUser()

  if (!user) redirect("/login")

  const supabase = await createClient()

  const [profileRes, symptoms] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle(),
    getSymptomsForUser(user.id, supabase),
  ])

  const profile = profileRes.data

  if (profile && profile.onboarding_completed === false) redirect("/onboarding")

  return (
    <div className="pb-8 max-w-4xl mx-auto">
      <SymptomHistory symptoms={symptoms} />
    </div>
  )
}
