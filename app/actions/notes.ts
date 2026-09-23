"use server"

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  NOTE_MAX_LENGTH,
  type DailyNoteRecord,
  type DailyNoteActionResult,
} from "@/lib/notes/types"

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
 * Internal: Fetch a single daily note for a specific date and user.
 */
export async function getDailyNoteByDateForUser(
  userId: string,
  date: string,
  customClient?: Awaited<ReturnType<typeof createClient>>
): Promise<DailyNoteRecord | null> {
  const supabase = customClient || (await createClient())
  const { data, error } = await supabase
    .from("daily_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle()

  if (error) {
    console.error("[getDailyNoteByDateForUser]", error.message)
    return null
  }

  return data as DailyNoteRecord | null
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
 * Public Server Action: Fetch a single daily note for a specific date.
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
 * Strictly enforces 1 note per user per date.
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

  // Pre-check for existing note on this date to return a helpful error
  const { data: existing } = await supabase
    .from("daily_notes")
    .select("id")
    .eq("date", date)
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      error: "A daily note already exists for this date. Please edit the existing note.",
      noteId: existing.id,
    }
  }

  const { data, error } = await supabase
    .from("daily_notes")
    .insert({
      user_id: user.id,
      date,
      content: rawContent,
    })
    .select("id")
    .single()

  if (error) {
    // Unique violation code 23505
    if (error.code === "23505") {
      return {
        success: false,
        error: "A daily note already exists for this date. Please edit the existing note.",
      }
    }
    console.error("[createDailyNoteAction]", error.message)
    return { success: false, error: "Failed to save note. Please try again." }
  }

  revalidatePath("/notes")
  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  return { success: true, noteId: data.id }
}

/**
 * Update an existing daily note.
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

  // Check if changing date would collide with another note
  const { data: existing } = await supabase
    .from("daily_notes")
    .select("id")
    .eq("date", date)
    .neq("id", id)
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      error: "Another daily note already exists for this date.",
    }
  }

  const { error } = await supabase
    .from("daily_notes")
    .update({
      date,
      content: rawContent,
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Another daily note already exists for this date.",
      }
    }
    console.error("[updateDailyNoteAction]", error.message)
    return { success: false, error: "Failed to update note. Please try again." }
  }

  revalidatePath("/notes")
  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  return { success: true, noteId: id }
}

/**
 * Delete a daily note by ID.
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
  return { success: true }
}
