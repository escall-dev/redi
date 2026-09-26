"use server"

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  NOTE_MAX_LENGTH,
  type DailyNoteRecord,
  type DailyNoteActionResult,
} from "@/lib/notes/types"
import { getPartnerRelationship } from "@/lib/partner/service"
import { sendPartnerCoManagementNotification } from "@/lib/partner/notification"

export type { DailyNoteRecord, DailyNoteActionResult }

/**
 * Internal: Fetch all daily notes for a specific authenticated user, newest first.
 */
export async function getDailyNotesForUser(
  userId: string,
  customClient?: Awaited<ReturnType<typeof createClient>>
): Promise<DailyNoteRecord[]> {
  const supabase = customClient || (await createClient())
  const { data, error } = await supabase
    .from("daily_notes")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getDailyNotesForUser]", error.message)
    return []
  }

  return (data ?? []) as DailyNoteRecord[]
}

/**
 * Internal: Fetch all daily notes for a specific date and user, newest first.
 */
export async function getDailyNotesByDateForUser(
  userId: string,
  date: string,
  customClient?: Awaited<ReturnType<typeof createClient>>
): Promise<DailyNoteRecord[]> {
  const supabase = customClient || (await createClient())
  const { data, error } = await supabase
    .from("daily_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getDailyNotesByDateForUser]", error.message)
    return []
  }

  return (data ?? []) as DailyNoteRecord[]
}

/**
 * Internal: Fetch the latest daily note for a specific date and user (backwards compatible).
 */
export async function getDailyNoteByDateForUser(
  userId: string,
  date: string,
  customClient?: Awaited<ReturnType<typeof createClient>>
): Promise<DailyNoteRecord | null> {
  const notes = await getDailyNotesByDateForUser(userId, date, customClient)
  return notes[0] ?? null
}

/**
 * Public Server Action: Fetch all daily notes for the authenticated user, newest first.
 */
export async function getDailyNotesAction(): Promise<DailyNoteRecord[]> {
  const user = await getAuthenticatedUser()
  if (!user) return []
  const supabase = await createClient()
  return getDailyNotesForUser(user.id, supabase)
}

/**
 * Public Server Action: Fetch all daily notes for a specific date, newest first.
 */
export async function getDailyNotesByDateAction(
  date: string
): Promise<DailyNoteRecord[]> {
  const user = await getAuthenticatedUser()
  if (!user) return []
  const supabase = await createClient()
  return getDailyNotesByDateForUser(user.id, date, supabase)
}

/**
 * Public Server Action: Fetch a single (latest) daily note for a specific date.
 */
export async function getDailyNoteByDateAction(
  date: string
): Promise<DailyNoteRecord | null> {
  const user = await getAuthenticatedUser()
  if (!user) return null
  const supabase = await createClient()
  return getDailyNoteByDateForUser(user.id, date, supabase)
}

/**
 * Create a daily note for a specific date.
 * Supports multiple distinct note entries on the same date with timestamps.
 */
export async function createDailyNoteAction(
  _prev: DailyNoteActionResult | null,
  formData: FormData
): Promise<DailyNoteActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to save notes." }
  }

  const todayStr = new Date().toISOString().split("T")[0]
  const date = (formData.get("date") as string | null)?.trim() ?? ""
  const rawContent = (formData.get("content") as string | null)?.trim() ?? ""

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, error: "A valid date is required." }
  }

  if (date > todayStr) {
    return { success: false, error: "You cannot save a note for a future date." }
  }

  if (!rawContent) {
    return { success: false, error: "Note content cannot be empty." }
  }

  if (rawContent.length > NOTE_MAX_LENGTH) {
    return {
      success: false,
      error: `Note content cannot exceed ${NOTE_MAX_LENGTH.toLocaleString()} characters.`,
    }
  }

  const { data, error } = await supabase
    .from("daily_notes")
    .insert({
      user_id: user.id,
      author_id: user.id,
      date,
      content: rawContent,
    })
    .select("id, created_at")
    .single()

  if (error || !data) {
    console.error("[createDailyNoteAction]", error?.message)
    return { success: false, error: "Failed to save note. Please try again." }
  }

  // ── Notify connected partner if active relationship & sharing enabled ──
  try {
    const relationship = await getPartnerRelationship(supabase, user.id)
    if (relationship && relationship.status === "active") {
      const isOwner = relationship.owner_user_id === user.id
      const recipientUserId = isOwner
        ? relationship.supporter_user_id
        : relationship.owner_user_id

      if (recipientUserId) {
        const { data: prefs } = await supabase
          .from("partner_sharing_preferences")
          .select("daily_notes")
          .eq("relationship_id", relationship.id)
          .maybeSingle()

        if (prefs && prefs.daily_notes) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", user.id)
            .maybeSingle()

          const actorUsername = profile?.username || "partner"

          await sendPartnerCoManagementNotification({
            supabase,
            recipientUserId,
            actorUsername,
            category: "partner_daily_notes",
            title: "New Daily Note",
            body: `@${actorUsername} added a new daily note.`,
            url: isOwner ? "/partner" : "/notes",
          })
        }
      }
    }
  } catch (notifErr) {
    // Non-blocking notification dispatch
    console.error("[createDailyNoteAction] Partner notification error:", notifErr)
  }

  revalidatePath("/notes")
  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  revalidatePath("/partner")
  return { success: true, noteId: data.id }
}

/**
 * Update an existing daily note by unique note ID.
 */
export async function updateDailyNoteAction(
  id: string,
  _prev: DailyNoteActionResult | null,
  formData: FormData
): Promise<DailyNoteActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to edit notes." }
  }

  const todayStr = new Date().toISOString().split("T")[0]
  const date = (formData.get("date") as string | null)?.trim() ?? ""
  const rawContent = (formData.get("content") as string | null)?.trim() ?? ""

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, error: "A valid date is required." }
  }

  if (date > todayStr) {
    return { success: false, error: "You cannot save a note for a future date." }
  }

  if (!rawContent) {
    return { success: false, error: "Note content cannot be empty." }
  }

  if (rawContent.length > NOTE_MAX_LENGTH) {
    return {
      success: false,
      error: `Note content cannot exceed ${NOTE_MAX_LENGTH.toLocaleString()} characters.`,
    }
  }

  const { error } = await supabase
    .from("daily_notes")
    .update({
      date,
      content: rawContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("[updateDailyNoteAction]", error.message)
    return { success: false, error: "Failed to update note. Please try again." }
  }

  revalidatePath("/notes")
  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  revalidatePath("/partner")
  return { success: true, noteId: id }
}

/**
 * Delete a single daily note by unique note ID.
 */
export async function deleteDailyNoteAction(
  id: string
): Promise<DailyNoteActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to delete notes." }
  }

  const { error } = await supabase
    .from("daily_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("[deleteDailyNoteAction]", error.message)
    return { success: false, error: "Failed to delete note. Please try again." }
  }

  revalidatePath("/notes")
  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  revalidatePath("/partner")
  return { success: true }
}
