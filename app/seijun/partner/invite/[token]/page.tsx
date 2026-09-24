import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function SeijunPartnerInviteRedirect({ params }: PageProps) {
  const { token } = await params
  redirect(`/partner/invite/${token}`)
}
