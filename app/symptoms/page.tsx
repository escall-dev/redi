import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getSymptomsAction } from "@/app/actions/symptoms"
import { SymptomHistory } from "@/components/symptoms/symptom-history"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Symptoms — Redi",
  description: "Record and review your personal symptom observations.",
}

export default async function SymptomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .single()

  if (profile && profile.onboarding_completed === false) redirect("/onboarding")

  const symptoms = await getSymptomsAction()

  return (
    <div className="pb-8 max-w-4xl mx-auto">
      <SymptomHistory symptoms={symptoms} />
    </div>
  )
}
