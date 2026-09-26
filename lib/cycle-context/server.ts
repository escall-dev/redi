import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import type {
  CycleContextMode,
  CycleContextState,
  CyclePartnerInfo,
  CyclePermissions,
} from "./types"
import type { SharingCategory, CoManagementPermission } from "@/lib/partner/authorization"
import { cookies } from "next/headers"

import { CYCLE_CONTEXT_COOKIE_NAME } from "./types"
export { CYCLE_CONTEXT_COOKIE_NAME }

/**
 * Resolves the centralized Cycle Context on the server.
 *
 * Implements authoritative role-based logic:
 *   - 'supporter': When in an active relationship as supporter, the primary
 *     cycle context is ALWAYS the connected cycle owner's cycle.
 *   - 'both': Can access both Own and Partner cycle contexts. Resolves based on
 *     cookie preference or explicitly requested mode.
 *   - 'cycle_tracker': Primary context is ALWAYS Own cycle.
 */
export async function resolveServerCycleContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  requestedMode?: CycleContextMode | null
): Promise<CycleContextState> {
  const defaultPermissions: CyclePermissions = {
    enabledCategories: [],
    managementPermissions: [],
    canManagePeriod: false,
    canManageCyclePrefs: false,
    canManageDailyNotes: false,
    hasCycleEstimates: false,
    hasPeriodStatus: false,
    hasDailyNotes: false,
    hasCyclePreferences: false,
  }

  const defaultPartnerInfo: CyclePartnerInfo = {
    partnerUserId: null,
    displayName: null,
    username: null,
    relationshipId: null,
    hasActivePartner: false,
    isSupporter: false,
    isOwner: false,
  }

  if (!userId) {
    return {
      mode: "own",
      isPartnerContext: false,
      isOwnContext: true,
      activeUserId: "",
      currentUserId: "",
      usageRole: null,
      partnerInfo: defaultPartnerInfo,
      permissions: defaultPermissions,
      canSwitchContext: false,
    }
  }

  // 1. Fetch current user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("usage_role, display_name, username")
    .eq("user_id", userId)
    .maybeSingle()

  const usageRole = (profile?.usage_role as "cycle_tracker" | "supporter" | "both" | null) ?? "cycle_tracker"

  // 2. Fetch active partner relationship (if any)
  const { data: activeRel } = await supabase
    .from("partner_relationships")
    .select("id, status, owner_user_id, supporter_user_id")
    .or(`owner_user_id.eq.${userId},supporter_user_id.eq.${userId}`)
    .eq("status", "active")
    .maybeSingle()

  const hasActivePartner = Boolean(activeRel && activeRel.supporter_user_id)
  let partnerInfo: CyclePartnerInfo = defaultPartnerInfo
  let permissions: CyclePermissions = defaultPermissions
  let partnerUserId: string | null = null

  if (activeRel && activeRel.supporter_user_id) {
    const isOwner = activeRel.owner_user_id === userId
    const isSupporter = activeRel.supporter_user_id === userId
    partnerUserId = isOwner ? activeRel.supporter_user_id : activeRel.owner_user_id

    // Fetch partner profile display info
    let partnerDisplayName = "Partner"
    let partnerUsername: string | null = null

    if (partnerUserId) {
      const { data: pProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", partnerUserId)
        .maybeSingle()

      if (pProfile) {
        partnerDisplayName = pProfile.display_name || pProfile.username || "Partner"
        partnerUsername = pProfile.username || null
      }
    }

    partnerInfo = {
      partnerUserId,
      displayName: partnerDisplayName,
      username: partnerUsername,
      relationshipId: activeRel.id,
      hasActivePartner: true,
      isSupporter,
      isOwner,
    }

    // Fetch sharing preferences for the relationship
    const { data: prefs } = await supabase
      .from("partner_sharing_preferences")
      .select("*")
      .eq("relationship_id", activeRel.id)
      .maybeSingle()

    if (prefs) {
      const enabledCats: SharingCategory[] = []
      if (prefs.cycle_estimates) enabledCats.push("cycle_estimates")
      if (prefs.period_status) enabledCats.push("period_status")
      if (prefs.cycle_preferences) enabledCats.push("cycle_preferences")
      if (prefs.daily_notes) enabledCats.push("daily_notes")

      const mgmtPerms: CoManagementPermission[] = []
      if (prefs.manage_cycle_preferences && prefs.cycle_preferences) {
        mgmtPerms.push("manage_cycle_preferences")
      }
      if (prefs.manage_period_status && prefs.period_status) {
        mgmtPerms.push("manage_period_status")
      }
      if (prefs.manage_daily_notes && prefs.daily_notes) {
        mgmtPerms.push("manage_daily_notes")
      }

      permissions = {
        enabledCategories: enabledCats,
        managementPermissions: mgmtPerms,
        canManagePeriod: mgmtPerms.includes("manage_period_status"),
        canManageCyclePrefs: mgmtPerms.includes("manage_cycle_preferences"),
        canManageDailyNotes: mgmtPerms.includes("manage_daily_notes"),
        hasCycleEstimates: Boolean(prefs.cycle_estimates),
        hasPeriodStatus: Boolean(prefs.period_status),
        hasDailyNotes: Boolean(prefs.daily_notes),
        hasCyclePreferences: Boolean(prefs.cycle_preferences),
      }
    }
  }

  // 3. Determine Context Mode based on usageRole, active partner, and preferences
  let mode: CycleContextMode = "own"
  let canSwitchContext = false

  if (usageRole === "supporter") {
    // Supporter primary context is ALWAYS Partner when an active relationship exists
    if (hasActivePartner && partnerInfo.isSupporter) {
      mode = "partner"
    } else {
      mode = "partner" // Keep supporter mode orientation even without active partner
    }
    canSwitchContext = false
  } else if (usageRole === "both" && hasActivePartner && partnerInfo.isSupporter) {
    canSwitchContext = true

    // Check cookie preference or explicit requestedMode
    let cookiePref: string | undefined
    try {
      const cookieStore = await cookies()
      cookiePref = cookieStore.get(CYCLE_CONTEXT_COOKIE_NAME)?.value
    } catch {
      // Non-cookie environment fallback
    }

    const preferredMode = requestedMode || cookiePref
    if (preferredMode === "partner") {
      mode = "partner"
    } else {
      mode = "own"
    }
  } else {
    // cycle_tracker or accounts without supporter role
    mode = "own"
    canSwitchContext = false
  }

  // 4. Resolve active target user ID
  let activeUserId = userId
  if (mode === "partner" && partnerInfo.partnerUserId) {
    // In partner context, target the connected Cycle Owner's ID
    activeUserId = partnerInfo.partnerUserId
  }

  return {
    mode,
    isPartnerContext: mode === "partner",
    isOwnContext: mode === "own",
    activeUserId,
    currentUserId: userId,
    usageRole,
    partnerInfo,
    permissions,
    canSwitchContext,
  }
}
