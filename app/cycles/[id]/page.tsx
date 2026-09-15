import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { getCycleByIdAction } from "@/app/actions/cycles"
import { CycleDetailView } from "@/components/cycles/cycle-detail-view"

interface CycleDetailPageProps {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: "Cycle Details — Redi",
  description: "View and edit cycle period days and flow.",
}

export default async function CycleDetailPage({ params }: CycleDetailPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const cycle = await getCycleByIdAction(id)

  if (!cycle) {
    notFound()
  }

  return <CycleDetailView cycle={cycle} />
}
