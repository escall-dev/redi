import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { getCycleByIdForUser } from "@/app/actions/cycles"
import { CycleDetailView } from "@/components/cycles/cycle-detail-view"

interface CycleDetailPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Cycle Details",
  description: "View and edit cycle period days and flow.",
}

export default async function CycleDetailPage({ params }: CycleDetailPageProps) {
  const { id } = await params

  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()
  const cycle = await getCycleByIdForUser(id, user.id, supabase)

  if (!cycle) {
    notFound()
  }

  return <CycleDetailView cycle={cycle} />
}
