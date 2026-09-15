import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"

export const metadata = {
  title: "Welcome",
  description: "Personalize your private cycle tracking in Redi.",
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch profile to see if onboarding is already completed
  let initialDisplayName = user.user_metadata?.display_name || ""
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, onboarding_completed")
    .eq("user_id", user.id)
    .single()

  if (profile?.onboarding_completed) {
    redirect("/dashboard")
  }

  if (profile?.display_name) {
    initialDisplayName = profile.display_name
  } else if (profileError) {
    const { data: fallbackProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
    if (fallbackProfile?.display_name) {
      initialDisplayName = fallbackProfile.display_name
    }
  }

  return <OnboardingForm initialDisplayName={initialDisplayName} />
}
