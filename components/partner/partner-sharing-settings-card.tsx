"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { SettingsToggle } from "@/components/settings/settings-toggle"
import { cn } from "@/lib/utils"
import {
  getPartnerSharingPreferencesAction,
  updatePartnerSharingPreferencesAction,
  revokePartnerRelationshipAction,
} from "@/app/actions/partner"
import type { PartnerSharingPreferences, PartnerSharingPreferencesInput } from "@/lib/partner/types"
import {
  Eye,
  Sliders,
  Activity,
  Droplets,
  Settings2,
  BookOpen,
  UserX,
  AlertCircle,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Sparkles,
  Check,
  ShieldCheck,
} from "lucide-react"

interface PartnerSharingSettingsCardProps {
  relationshipId: string
  partnerDisplayName?: string
  partnerUsername?: string
  onRevoked?: () => void
}

export function PartnerSharingSettingsCard({
  relationshipId,
  partnerDisplayName = "Partner",
  partnerUsername,
  onRevoked,
}: PartnerSharingSettingsCardProps) {
  const [prefs, setPrefs] = React.useState<PartnerSharingPreferences | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [revokeDialogOpen, setRevokeDialogOpen] = React.useState(false)
  const [revokePending, setRevokePending] = React.useState(false)
  const [confirmAllDialogOpen, setConfirmAllDialogOpen] = React.useState(false)
  const [pendingAllAction, setPendingAllAction] = React.useState<boolean | null>(null)

  const isAllAllowed = Boolean(
    prefs &&
    prefs.cycle_estimates &&
    prefs.period_status &&
    prefs.cycle_preferences &&
    prefs.daily_notes &&
    prefs.manage_cycle_preferences &&
    prefs.manage_period_status &&
    prefs.manage_daily_notes
  )

  const isSomeAllowed = Boolean(
    prefs && (
      prefs.cycle_estimates ||
      prefs.period_status ||
      prefs.cycle_preferences ||
      prefs.daily_notes ||
      prefs.manage_cycle_preferences ||
      prefs.manage_period_status ||
      prefs.manage_daily_notes
    )
  )

  const loadPreferences = React.useCallback(async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const res = await getPartnerSharingPreferencesAction(relationshipId)
      if (res.ok && res.data) {
        setPrefs(res.data)
      } else {
        setErrorMsg(res.error || "Failed to load partner preferences.")
      }
    } catch {
      setErrorMsg("Error loading partner sharing preferences.")
    } finally {
      setLoading(false)
    }
  }, [relationshipId])

  React.useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const handleToggle = async (key: keyof PartnerSharingPreferences, value: boolean) => {
    if (!prefs) return

    setErrorMsg(null)
    setSuccessMsg(null)
    setSavingKey(key)

    // Compute updates with dependency rules
    const updates: Partial<PartnerSharingPreferences> = { [key]: value }

    // If turning off a view category, automatically turn off its co-management capability
    if (key === "cycle_preferences" && !value) {
      updates.manage_cycle_preferences = false
    }
    if (key === "period_status" && !value) {
      updates.manage_period_status = false
    }
    if (key === "daily_notes" && !value) {
      updates.manage_daily_notes = false
    }

    // Optimistic update
    const previousPrefs = { ...prefs }
    setPrefs({ ...prefs, ...updates })

    try {
      const res = await updatePartnerSharingPreferencesAction(relationshipId, updates)
      if (res.ok && res.data) {
        setPrefs(res.data)
        setSuccessMsg("Preferences updated.")
        setTimeout(() => setSuccessMsg(null), 2500)
      } else {
        setPrefs(previousPrefs)
        setErrorMsg(res.error || "Failed to update preference.")
      }
    } catch {
      setPrefs(previousPrefs)
      setErrorMsg("Network error saving preference.")
    } finally {
      setSavingKey(null)
    }
  }

  const handleInitiateToggleAll = (targetValue: boolean) => {
    setPendingAllAction(targetValue)
    setConfirmAllDialogOpen(true)
  }

  const handleConfirmToggleAll = async () => {
    if (!prefs || pendingAllAction === null) return
    const targetValue = pendingAllAction
    setConfirmAllDialogOpen(false)
    setPendingAllAction(null)

    setErrorMsg(null)
    setSuccessMsg(null)
    setSavingKey("all")

    const updates: PartnerSharingPreferencesInput = {
      cycle_estimates: targetValue,
      period_status: targetValue,
      cycle_preferences: targetValue,
      daily_notes: targetValue,
      manage_cycle_preferences: targetValue,
      manage_period_status: targetValue,
      manage_daily_notes: targetValue,
    }

    // Optimistic update
    const previousPrefs = { ...prefs }
    setPrefs({
      ...prefs,
      ...updates,
    })

    try {
      const res = await updatePartnerSharingPreferencesAction(relationshipId, updates)
      if (res.ok && res.data) {
        setPrefs(res.data)
        setSuccessMsg(targetValue ? "All permissions granted." : "All permissions disabled.")
        setTimeout(() => setSuccessMsg(null), 2500)
      } else {
        setPrefs(previousPrefs)
        setErrorMsg(res.error || "Failed to update permissions.")
      }
    } catch {
      setPrefs(previousPrefs)
      setErrorMsg("Network error saving permissions.")
    } finally {
      setSavingKey(null)
    }
  }

  const handleRevoke = async () => {
    setRevokePending(true)
    setErrorMsg(null)
    try {
      const res = await revokePartnerRelationshipAction(relationshipId)
      if (res.ok) {
        setRevokeDialogOpen(false)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("seijun:partner-state-changed"))
          window.dispatchEvent(new CustomEvent("seijun:notification-update"))
        }
        if (onRevoked) onRevoked()
      } else {
        setErrorMsg(res.error || "Failed to revoke partner connection.")
      }
    } catch {
      setErrorMsg("Error revoking partner connection.")
    } finally {
      setRevokePending(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-border/70 shadow-xs">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Sliders className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Partner Access Control</CardTitle>
                <CardDescription className="text-xs">
                  Manage view and co-management permissions for {partnerDisplayName}.
                </CardDescription>
              </div>
            </div>
            {successMsg && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
                <CheckCircle2 className="size-3" />
                Saved
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MASTER TOGGLE: ALLOW ALL SHARING & ACCESS */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-lavender/30 to-background p-4 shadow-xs transition-all duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs shrink-0 mt-0.5">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-foreground">Allow All Sharing & Access</p>
                    {isAllAllowed ? (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium">
                        Full Access
                      </Badge>
                    ) : isSomeAllowed ? (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary bg-primary/5 font-medium">
                        Partial Access
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-muted-foreground/30 text-muted-foreground font-normal">
                        All Off
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Grant or revoke all view sharing categories and co-management capabilities at once.
                  </p>
                </div>
              </div>
              <SettingsToggle
                id="allow-all-toggle"
                checked={isAllAllowed}
                loading={savingKey === "all"}
                onChange={(val) => handleInitiateToggleAll(val)}
                ariaLabel="Toggle allow all partner access"
              />
            </div>
          </div>

          {/* SECTION 1: SHARING (VIEW ACCESS) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <Eye className="size-3.5 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                View Access (Sharing)
              </h3>
            </div>
            <div className="divide-y divide-border/40 rounded-2xl border border-border/50 bg-secondary/15 overflow-hidden">
              {/* Cycle Estimates */}
              <div className="flex items-center justify-between p-3.5 gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                    <Activity className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Cycle Estimates</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Share cycle day, current phase, and estimated next period.
                    </p>
                  </div>
                </div>
                <SettingsToggle
                  checked={prefs?.cycle_estimates ?? false}
                  loading={savingKey === "cycle_estimates"}
                  onChange={(val) => handleToggle("cycle_estimates", val)}
                  ariaLabel="Toggle cycle estimates sharing"
                />
              </div>

              {/* Period Status */}
              <div className="flex items-center justify-between p-3.5 gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5">
                    <Droplets className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Period Status</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Share whether period is active and past period dates.
                    </p>
                  </div>
                </div>
                <SettingsToggle
                  checked={prefs?.period_status ?? false}
                  loading={savingKey === "period_status"}
                  onChange={(val) => handleToggle("period_status", val)}
                  ariaLabel="Toggle period status sharing"
                />
              </div>

              {/* Cycle Preferences */}
              <div className="flex items-center justify-between p-3.5 gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                    <Settings2 className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Cycle Preferences</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Share typical cycle length setting and period history baseline.
                    </p>
                  </div>
                </div>
                <SettingsToggle
                  checked={prefs?.cycle_preferences ?? false}
                  loading={savingKey === "cycle_preferences"}
                  onChange={(val) => handleToggle("cycle_preferences", val)}
                  ariaLabel="Toggle cycle preferences sharing"
                />
              </div>

              {/* Daily Notes */}
              <div className="flex items-center justify-between p-3.5 gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <BookOpen className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Daily Notes</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Share daily journal and log notes with your partner.
                    </p>
                  </div>
                </div>
                <SettingsToggle
                  checked={prefs?.daily_notes ?? false}
                  loading={savingKey === "daily_notes"}
                  onChange={(val) => handleToggle("daily_notes", val)}
                  ariaLabel="Toggle daily notes sharing"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CO-MANAGEMENT (MANAGEMENT ACCESS) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <Sliders className="size-3.5 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Co-Management Access
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary">
                Controlled Writes
              </Badge>
            </div>
            <div className="divide-y divide-border/40 rounded-2xl border border-border/50 bg-secondary/15 overflow-hidden">
              {/* Manage Period Status */}
              <div className="flex items-center justify-between p-3.5 gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 shrink-0 mt-0.5">
                    <Droplets className="size-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">Manage Period Status</p>
                      {!prefs?.period_status && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          (Requires View)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Allow partner to log period start dates and update active period entries.
                    </p>
                  </div>
                </div>
                <SettingsToggle
                  checked={prefs?.manage_period_status ?? false}
                  disabled={!prefs?.period_status}
                  loading={savingKey === "manage_period_status"}
                  onChange={(val) => handleToggle("manage_period_status", val)}
                  ariaLabel="Toggle manage period status permission"
                />
              </div>

              {/* Manage Cycle Preferences */}
              <div className="flex items-center justify-between p-3.5 gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 shrink-0 mt-0.5">
                    <Settings2 className="size-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">Manage Cycle Preferences</p>
                      {!prefs?.cycle_preferences && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          (Requires View)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Allow partner to configure typical cycle length and baseline start dates.
                    </p>
                  </div>
                </div>
                <SettingsToggle
                  checked={prefs?.manage_cycle_preferences ?? false}
                  disabled={!prefs?.cycle_preferences}
                  loading={savingKey === "manage_cycle_preferences"}
                  onChange={(val) => handleToggle("manage_cycle_preferences", val)}
                  ariaLabel="Toggle manage cycle preferences permission"
                />
              </div>

              {/* Manage Daily Notes */}
              <div className="flex items-center justify-between p-3.5 gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0 mt-0.5">
                    <BookOpen className="size-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">Manage Daily Notes</p>
                      {!prefs?.daily_notes && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          (Requires View)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Allow partner to create, edit, and delete shared daily journal notes.
                    </p>
                  </div>
                </div>
                <SettingsToggle
                  checked={prefs?.manage_daily_notes ?? false}
                  disabled={!prefs?.daily_notes}
                  loading={savingKey === "manage_daily_notes"}
                  onChange={(val) => handleToggle("manage_daily_notes", val)}
                  ariaLabel="Toggle manage daily notes permission"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: REVOCATION ACTION */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevokeDialogOpen(true)}
              className="w-full h-10 rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-border/70 cursor-pointer gap-2"
            >
              <UserX className="size-3.5" />
              <span>Revoke Partner Connection</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revocation Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 overflow-hidden">
          <DialogHeader className="text-center space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
              <ShieldAlert className="size-6 stroke-[2.2]" />
            </div>
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              Revoke Partner Connection?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to disconnect from{" "}
              <span className="font-semibold text-foreground">{partnerDisplayName}</span>
              {partnerUsername && (
                <span className="font-mono text-primary font-medium"> (@{partnerUsername})</span>
              )}
              ? They will immediately lose all access to view and co-manage your cycle data.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={revokePending}
              onClick={() => setRevokeDialogOpen(false)}
              className="flex-1 h-10 rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={revokePending}
              onClick={handleRevoke}
              className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer gap-1.5 shadow-xs"
            >
              {revokePending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Revoking...</span>
                </>
              ) : (
                <span>Yes, Revoke</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allow All Confirmation Dialog */}
      <Dialog open={confirmAllDialogOpen} onOpenChange={setConfirmAllDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 overflow-hidden">
          <DialogHeader className="text-center space-y-2">
            <div
              className={cn(
                "mx-auto flex size-12 items-center justify-center rounded-2xl border",
                pendingAllAction
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              )}
            >
              {pendingAllAction ? (
                <ShieldCheck className="size-6 stroke-[2.2]" />
              ) : (
                <ShieldAlert className="size-6 stroke-[2.2]" />
              )}
            </div>
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              {pendingAllAction ? "Allow All Sharing & Access?" : "Revoke All Sharing & Access?"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {pendingAllAction ? (
                <>
                  This will grant{" "}
                  <span className="font-semibold text-foreground">{partnerDisplayName}</span> access
                  to view all your cycle metrics (cycle estimates, period status, cycle preferences,
                  and daily notes) and enable all co-management writing permissions.
                </>
              ) : (
                <>
                  This will turn off all view sharing and co-management permissions for{" "}
                  <span className="font-semibold text-foreground">{partnerDisplayName}</span>. They
                  will no longer be able to view or edit any cycle data.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={savingKey === "all"}
              onClick={() => {
                setConfirmAllDialogOpen(false)
                setPendingAllAction(null)
              }}
              className="flex-1 h-10 rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={pendingAllAction ? "default" : "destructive"}
              disabled={savingKey === "all"}
              onClick={handleConfirmToggleAll}
              className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer gap-1.5 shadow-xs"
            >
              {savingKey === "all" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : pendingAllAction ? (
                <>
                  <Check className="size-3.5" />
                  <span>Allow All</span>
                </>
              ) : (
                <>
                  <UserX className="size-3.5" />
                  <span>Revoke All</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
