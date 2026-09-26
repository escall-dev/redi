import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCyclesForUser } from "@/app/actions/cycles"
import { CycleList } from "@/components/cycles/cycle-list"
import { resolveServerCycleContext } from "@/lib/cycle-context/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Cycles",
  description: "View and manage your menstrual cycles and period days.",
}

export default async function CyclesPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()
  const cycleContext = await resolveServerCycleContext(supabase, user.id)

  // In partner context, supporter should not view a personal cycle list
  if (cycleContext.isPartnerContext) {
    redirect("/dashboard")
  }

  const cycles = await getCyclesForUser(user.id, supabase)

  return <CycleList cycles={cycles} />
}
