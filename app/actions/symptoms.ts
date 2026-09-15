"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  SYMPTOM_OPTIONS,
  SEVERITY_VALUES,
  isValidSymptom,
  isValidSeverity,
  type SymptomRecord,
  type SeverityValue,
} from "@/lib/symptoms/constants"

export type { SymptomRecord, SeverityValue }

export interface SymptomActionResult {
  success?: boolean
  error?: string
  symptomId?: string
}

const NOTES_MAX_LENGTH = 500

export async function getSymptomsAction(): Promise<SymptomRecord[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("symptoms")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) { console.error("[getSymptomsAction]", error.message); return [] }
  return (data ?? []) as SymptomRecord[]
}

export async function getSymptomsByDateAction(date: string): Promise<SymptomRecord[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("symptoms")
    .select("*")
    .eq("date", date)
    .order("created_at", { ascending: true })
  if (error) { console.error("[getSymptomsByDateAction]", error.message); return [] }
  return (data ?? []) as SymptomRecord[]
}

export async function createSymptomAction(
  _prev: SymptomActionResult | null,
  formData: FormData
): Promise<SymptomActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "You must be signed in to log symptoms." }

  const todayStr = new Date().toISOString().split("T")[0]
  const date = (formData.get("date") as string | null)?.trim() ?? ""
  const symptom = (formData.get("symptom") as string | null)?.trim() ?? ""
  const severity = (formData.get("severity") as string | null)?.trim() ?? ""
  const rawNotes = (formData.get("notes") as string | null)?.trim() ?? ""
  const notes = rawNotes.length > 0 ? rawNotes : null

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: "A valid date is required." }
  if (date > todayStr) return { success: false, error: "You cannot log a symptom for a future date." }
  if (!isValidSymptom(symptom)) return { success: false, error: `Invalid symptom. Must be one of: ${SYMPTOM_OPTIONS.join(", ")}.` }
  if (!isValidSeverity(severity)) return { success: false, error: `Invalid severity. Must be one of: ${SEVERITY_VALUES.join(", ")}.` }
  if (notes && notes.length > NOTES_MAX_LENGTH) return { success: false, error: `Notes must be ${NOTES_MAX_LENGTH} characters or fewer.` }

  const { data, error } = await supabase
    .from("symptoms")
    .insert({ user_id: user.id, date, symptom, severity, notes })
    .select("id")
    .single()

  if (error) { console.error("[createSymptomAction]", error.message); return { success: false, error: "Failed to save symptom. Please try again." } }

  revalidatePath("/symptoms")
  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  return { success: true, symptomId: data.id }
}

export async function updateSymptomAction(
  id: string,
  _prev: SymptomActionResult | null,
  formData: FormData
): Promise<SymptomActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "You must be signed in to edit symptoms." }

  const todayStr = new Date().toISOString().split("T")[0]
  const date = (formData.get("date") as string | null)?.trim() ?? ""
  const symptom = (formData.get("symptom") as string | null)?.trim() ?? ""
  const severity = (formData.get("severity") as string | null)?.trim() ?? ""
  const rawNotes = (formData.get("notes") as string | null)?.trim() ?? ""
  const notes = rawNotes.length > 0 ? rawNotes : null

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: "A valid date is required." }
  if (date > todayStr) return { success: false, error: "You cannot log a symptom for a future date." }
  if (!isValidSymptom(symptom)) return { success: false, error: `Invalid symptom. Must be one of: ${SYMPTOM_OPTIONS.join(", ")}.` }
  if (!isValidSeverity(severity)) return { success: false, error: `Invalid severity. Must be one of: ${SEVERITY_VALUES.join(", ")}.` }
  if (notes && notes.length > NOTES_MAX_LENGTH) return { success: false, error: `Notes must be ${NOTES_MAX_LENGTH} characters or fewer.` }

  const { error } = await supabase
    .from("symptoms")
    .update({ date, symptom, severity, notes })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) { console.error("[updateSymptomAction]", error.message); return { success: false, error: "Failed to update symptom. Please try again." } }

  revalidatePath("/symptoms")
  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  return { success: true, symptomId: id }
}

export async function deleteSymptomAction(id: string): Promise<SymptomActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "You must be signed in to delete symptoms." }

  const { error } = await supabase
    .from("symptoms")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) { console.error("[deleteSymptomAction]", error.message); return { success: false, error: "Failed to delete symptom. Please try again." } }

  revalidatePath("/symptoms")
  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  return { success: true }
}
