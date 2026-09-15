import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCyclesAction } from "@/app/actions/cycles"
import { CycleList } from "@/components/cycles/cycle-list"

export const metadata = {
  title: "Cycle History — Redi",
  description: "View and manage your menstrual cycles and period days.",
}

export default async function CyclesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const cycles = await getCyclesAction()

  return <CycleList cycles={cycles} />
}
