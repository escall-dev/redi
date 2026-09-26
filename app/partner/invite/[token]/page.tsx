import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { verifyInvitation } from "@/lib/partner/service"
import { InvitationAcceptanceView } from "@/components/partner/invitation-acceptance-view"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Partner Invitation | Seijun",
  description: "Review and accept your partner invitation on Seijun.",
}

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function PartnerInvitePage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()
  const user = await getAuthenticatedUser()

  let currentUsername: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle()
    currentUsername = profile?.username || null
  }

  const verification = await verifyInvitation(supabase, token, user?.id)

  return (
    <InvitationAcceptanceView
      rawToken={token}
      initialVerification={verification}
      currentUser={user ? { id: user.id, email: user.email } : null}
      currentUsername={currentUsername}
    />
  )
}
