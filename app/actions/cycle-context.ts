"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import {
  resolveServerCycleContext,
  CYCLE_CONTEXT_COOKIE_NAME,
} from "@/lib/cycle-context/server"
import type { CycleContextMode, CycleContextState } from "@/lib/cycle-context/types"

export async function getCycleContextAction(): Promise<CycleContextState | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return await resolveServerCycleContext(supabase, user.id)
  } catch {
    return null
  }
}

export async function setCycleContextAction(
  mode: CycleContextMode
): Promise<{ ok: boolean; mode?: CycleContextMode; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { ok: false, error: "Authentication required." }
    }

    const cookieStore = await cookies()
    cookieStore.set(CYCLE_CONTEXT_COOKIE_NAME, mode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    })

    revalidatePath("/", "layout")
    return { ok: true, mode }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to set cycle context."
    return { ok: false, error: message }
  }
}
