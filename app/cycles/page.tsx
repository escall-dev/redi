import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCyclesForUser } from "@/app/actions/cycles"
import { CycleList } from "@/components/cycles/cycle-list"

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
  const cycles = await getCyclesForUser(user.id, supabase)

  return <CycleList cycles={cycles} />
}
