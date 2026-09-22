import { notFound } from "next/navigation"
import { AdminPushBroadcastCard } from "./broadcast-card"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin Push Broadcast Test (Phase 17.9)",
  description: "Administrative test tool to broadcast test notification across all persisted subscriptions.",
}

export default async function AdminPushTestPage() {
  // Server-enforced protection: In production, reject access unless ADMIN_TEST_SECRET is configured
  const isDev = process.env.NODE_ENV === "development"
  const hasAdminSecret = Boolean(process.env.ADMIN_TEST_SECRET || process.env.ADMIN_PUSH_KEY)

  if (!isDev && !hasAdminSecret) {
    notFound()
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Admin Push Broadcast Test
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Phase 17.9 Test B — Validates global infrastructure delivery across all persisted push subscriptions.
        </p>
      </div>

      <AdminPushBroadcastCard isDev={isDev} />
    </div>
  )
}
