import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

/**
 * Request-scoped memoized server user profile getter.
 * Uses React.cache() to deduplicate profile queries across layouts, pages,
 * server context resolution, and subcomponents within the same request lifecycle.
 *
 * Ensures subsequent calls for the same userId within a render pass take 0ms
 * without additional network roundtrips to Supabase.
 */
export const getServerUserProfile = cache(
  async (userId: string): Promise<ProfileRow | null> => {
    if (!userId) return null
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, user_id, display_name, username, avatar_url, sex, usage_role, last_period_start, typical_cycle_length, onboarding_completed, affinity_display_format, created_at, updated_at"
        )
        .eq("user_id", userId)
        .maybeSingle()

      if (error || !data) return null
      return data as ProfileRow
    } catch {
      return null
    }
  }
)
