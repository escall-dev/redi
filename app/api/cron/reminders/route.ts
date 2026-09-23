/**
 * Seijun Phase 18: Scheduled Reminders Route Handler
 *
 * Provides a lightweight cron endpoint for processing scheduled cycle reminders.
 * Can be triggered periodically via Vercel Cron, external webhook, or local testing.
 *
 * SECURITY:
 * If CRON_SECRET is configured, verifies Bearer token in the Authorization header.
 */

import { NextResponse } from "next/server"
import { processPendingNotificationEvents } from "@/lib/reminders/processor"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function verifyCronAuthorization(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  // If no secret is configured, allow in development or internal execution
  if (!secret) return true

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!verifyCronAuthorization(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const summary = await processPendingNotificationEvents()
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), summary })
}

export async function POST(request: Request) {
  if (!verifyCronAuthorization(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const summary = await processPendingNotificationEvents()
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), summary })
}
