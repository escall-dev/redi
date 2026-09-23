/**
 * Seijun Phase 18: Reminder Synchronization & Recalculation Pipeline
 *
 * Implements deterministic lifecycle management for cycle reminders:
 * 1. Cancels obsolete pending events on cycle changes
 * 2. Generates updated future reminder events
 * 3. Preserves historical sent/failed records intact
 * 4. Strictly prevents duplicate events across multiple recalculations
 */

import { createClient } from "@/lib/supabase/server"
import { getCyclesForUser } from "@/app/actions/cycles"
import { getNotificationPreferences } from "@/lib/server/notification-preferences"
import { calculateCycleReminders } from "./engine"
import type { Database } from "@/lib/supabase/types"

// Server-only guard
if (typeof window !== "undefined") {
  throw new Error(
    "[SECURITY VIOLATION] sync-reminders utility must only be executed in a server environment."
  )
}

export interface SyncRemindersResult {
  ok: boolean
  eligible: boolean
  cancelledCount: number
  createdCount: number
  error?: string
}

/**
 * Synchronizes cycle reminder events for a specific user.
 * Idempotent: Can be safely called repeatedly with identical state.
 */
export async function syncUserReminders(
  userId: string,
  providedSupabase?: Awaited<ReturnType<typeof createClient>>
): Promise<SyncRemindersResult> {
  if (!userId) {
    return { ok: false, eligible: false, cancelledCount: 0, createdCount: 0, error: "Missing user_id." }
  }

  const supabase = providedSupabase ?? (await createClient())

  try {
    // 1. Concurrently fetch profile, cycles, and notification preferences
    const [profileRes, cycles, preferences] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, usage_role, typical_cycle_length, last_period_start, onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle(),
      getCyclesForUser(userId, supabase),
      getNotificationPreferences(userId),
    ])

    const profileData = profileRes.data

    if (!profileData) {
      return {
        ok: true,
        eligible: false,
        cancelledCount: 0,
        createdCount: 0,
        error: "Profile not found.",
      }
    }

    // 2. Run deterministic calculation engine
    const engineResult = calculateCycleReminders({
      profile: {
        id: profileData.id,
        usage_role: profileData.usage_role,
        typical_cycle_length: profileData.typical_cycle_length,
        last_period_start: profileData.last_period_start,
        onboarding_completed: profileData.onboarding_completed,
      },
      cycles,
      preferences,
    })

    // If ineligible (e.g. supporter role or insufficient data), cancel any existing pending events
    if (!engineResult.eligible || engineResult.candidates.length === 0) {
      const { data: cancelledRows } = await supabase
        .from("notification_events")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("status", "pending")
        .select("id")

      return {
        ok: true,
        eligible: engineResult.eligible,
        cancelledCount: cancelledRows?.length ?? 0,
        createdCount: 0,
      }
    }

    // 3. Cycle Recalculation:
    // Query already-sent events to prevent generating a pending duplicate for an already-delivered reminder
    const { data: sentEvents } = await supabase
      .from("notification_events")
      .select("type, scheduled_for, cycle_id")
      .eq("user_id", userId)
      .eq("status", "sent")

    const sentKeySet = new Set(
      (sentEvents || []).map(
        (e) => `${e.type}:${e.scheduled_for}:${e.cycle_id ?? "none"}`
      )
    )

    // Filter out candidates that were already sent to the user
    const pendingCandidates = engineResult.candidates.filter((candidate) => {
      const key = `${candidate.type}:${candidate.scheduled_for}:${candidate.cycle_id ?? "none"}`
      return !sentKeySet.has(key)
    })

    // Cancel obsolete pending events for this user (they will be replaced by the fresh calculation)
    const { data: cancelledRows } = await supabase
      .from("notification_events")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("id")

    const cancelledCount = cancelledRows?.length ?? 0

    if (pendingCandidates.length === 0) {
      return {
        ok: true,
        eligible: true,
        cancelledCount,
        createdCount: 0,
      }
    }

    // 4. Insert new pending events
    type EventInsert = Database["public"]["Tables"]["notification_events"]["Insert"]
    const rowsToInsert: EventInsert[] = pendingCandidates.map((c) => ({
      user_id: userId,
      cycle_id: c.cycle_id,
      type: c.type,
      scheduled_for: c.scheduled_for,
      status: "pending",
      title: c.title,
      body: c.body,
      url: c.url,
      metadata: (c.metadata ?? {}) as Database["public"]["Tables"]["notification_events"]["Insert"]["metadata"],
    }))

    const { data: insertedRows, error: insertError } = await supabase
      .from("notification_events")
      .insert(rowsToInsert)
      .select("id")

    if (insertError) {
      console.warn("[syncUserReminders] Note during batch insert:", insertError.message)
      return {
        ok: false,
        eligible: true,
        cancelledCount,
        createdCount: 0,
        error: insertError.message,
      }
    }

    return {
      ok: true,
      eligible: true,
      cancelledCount,
      createdCount: insertedRows?.length ?? 0,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to sync reminders."
    console.error("[syncUserReminders] Exception:", errorMsg)
    return {
      ok: false,
      eligible: false,
      cancelledCount: 0,
      createdCount: 0,
      error: errorMsg,
    }
  }
}
