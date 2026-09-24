"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  HeartHandshake,
  Activity,
  Droplets,
  Settings2,
  BookOpen,
  ChevronLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  UserX,
  CalendarDays,
  TrendingUp,
  Clock,
  Plus,
  Edit3,
  Trash2,
  Check,
  Sparkles,
} from "lucide-react"
import {
  getPartnerDashboardAction,
  getSharedCycleEstimatesAction,
  getSharedPeriodStatusAction,
  getSharedCyclePreferencesAction,
  getSharedDailyNotesAction,
  type PartnerDashboardData,
  type SharedCycleEstimateResult,
  type SharedPeriodStatusResult,
  type SharedCyclePreferencesResult,
  type SharedDailyNotesResult,
} from "@/app/actions/partner-shared"
import {
  recordPartnerPeriodAction,
  updatePartnerCyclePreferencesAction,
  createPartnerDailyNoteAction,
  deletePartnerDailyNoteAction,
} from "@/app/actions/partner-mutations"
import { useAppRouter } from "@/components/navigation/use-app-router"

/**
 * Seijun Phase 19 Batch 4
 * Supporter-Facing Partner Dashboard & Co-Management
 *
 * This is a dedicated view for supporters.
 * When co-management permissions are enabled by the owner, capability-specific
 * mutation controls appear seamlessly. When disabled, the dashboard remains
 * strictly read-only.
 */

export function PartnerDashboardView() {
  const router = useAppRouter()
  const [dashboardData, setDashboardData] = React.useState<PartnerDashboardData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Category data
  const [cycleEstimates, setCycleEstimates] = React.useState<SharedCycleEstimateResult | null>(null)
  const [periodStatus, setPeriodStatus] = React.useState<SharedPeriodStatusResult | null>(null)
  const [cyclePreferences, setCyclePreferences] = React.useState<SharedCyclePreferencesResult | null>(null)
  const [dailyNotes, setDailyNotes] = React.useState<SharedDailyNotesResult | null>(null)
  const [categoryLoading, setCategoryLoading] = React.useState(true)

  const refreshEstimates = React.useCallback(async () => {
    const res = await getSharedCycleEstimatesAction()
    setCycleEstimates(res)
  }, [])

  const refreshPeriod = React.useCallback(async () => {
    const res = await getSharedPeriodStatusAction()
    setPeriodStatus(res)
  }, [])

  const refreshCyclePreferences = React.useCallback(async () => {
    const res = await getSharedCyclePreferencesAction()
    setCyclePreferences(res)
  }, [])

  const refreshDailyNotes = React.useCallback(async () => {
    const res = await getSharedDailyNotesAction()
    setDailyNotes(res)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const result = await getPartnerDashboardAction()
        if (cancelled) return
        setDashboardData(result)

        if (!result.authorized) {
          setLoading(false)
          setCategoryLoading(false)
          return
        }

        setLoading(false)

        // Independently fetch only enabled categories
        const categories = result.enabledCategories || []
        setCategoryLoading(true)

        const promises: Promise<void>[] = []

        if (categories.includes("cycle_estimates")) {
          promises.push(
            getSharedCycleEstimatesAction().then((r) => {
              if (!cancelled) setCycleEstimates(r)
            })
          )
        }
        if (categories.includes("period_status")) {
          promises.push(
            getSharedPeriodStatusAction().then((r) => {
              if (!cancelled) setPeriodStatus(r)
            })
          )
        }
        if (categories.includes("cycle_preferences")) {
          promises.push(
            getSharedCyclePreferencesAction().then((r) => {
              if (!cancelled) setCyclePreferences(r)
            })
          )
        }
        if (categories.includes("daily_notes")) {
          promises.push(
            getSharedDailyNotesAction().then((r) => {
              if (!cancelled) setDailyNotes(r)
            })
          )
        }

        await Promise.all(promises)
        if (!cancelled) setCategoryLoading(false)
      } catch {
        if (!cancelled) {
          setError("Failed to load partner dashboard.")
          setLoading(false)
          setCategoryLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 pb-8 max-w-2xl mx-auto animate-in fade-in duration-200">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6 pb-8 max-w-2xl mx-auto animate-in fade-in duration-200">
        <PartnerDashboardHeader />
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <AlertCircle className="size-8 text-destructive" />
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="rounded-xl text-xs cursor-pointer"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No active relationship / not a supporter
  if (!dashboardData?.authorized) {
    return (
      <div className="space-y-6 pb-8 max-w-2xl mx-auto animate-in fade-in duration-200">
        <PartnerDashboardHeader />
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary/50 text-muted-foreground">
              <UserX className="size-7" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">No Partner Connection</p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                {dashboardData?.reason === "NOT_SUPPORTER"
                  ? "This dashboard is for supporters. As the cycle owner, your data is on the main dashboard."
                  : "Connect with a partner to view shared cycle data here."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/settings/partner")}
              className="rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <HeartHandshake className="size-3.5" />
              Partner Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const categories = dashboardData.enabledCategories || []
  const managementPermissions = dashboardData.managementPermissions || []
  const noSharedCategories = categories.length === 0

  const canManagePeriod = managementPermissions.includes("manage_period_status")
  const canManageCyclePrefs = managementPermissions.includes("manage_cycle_preferences")
  const canManageDailyNotes = managementPermissions.includes("manage_daily_notes")

  return (
    <div className="space-y-6 pb-8 max-w-2xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <PartnerDashboardHeader />

      {/* Partner Profile Card */}
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-lavender text-primary border border-lavender-border/60">
              <HeartHandshake className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {dashboardData.ownerDisplayName}
              </p>
              {dashboardData.ownerUsername && (
                <p className="text-xs font-mono text-primary font-medium">
                  @{dashboardData.ownerUsername}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 font-medium border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0"
            >
              Connected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Mode Indicator: Co-Management vs Read-Only */}
      {managementPermissions.length > 0 ? (
        <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <Sparkles className="size-3.5 text-primary shrink-0" />
          <span>
            Co-Management Active • Authorized by {dashboardData.ownerDisplayName}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <Eye className="size-3.5 shrink-0" />
          <span>Read-only view • Data shared at your partner&apos;s discretion</span>
        </div>
      )}

      {/* No Sharing Enabled */}
      {noSharedCategories && (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary/50 text-muted-foreground">
              <EyeOff className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No Data Shared Yet</p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Your partner hasn&apos;t enabled any sharing categories yet. They can control what
                data is shared from their Settings.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shared Category Cards — only rendered for enabled categories */}
      {categoryLoading && categories.length > 0 ? (
        <div className="space-y-4">
          {categories.map((cat) => (
            <Skeleton key={cat} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cycle Estimates */}
          {categories.includes("cycle_estimates") && cycleEstimates && (
            <CycleEstimatesCard data={cycleEstimates} />
          )}

          {/* Period Status */}
          {categories.includes("period_status") && periodStatus && (
            <PeriodStatusCard
              data={periodStatus}
              canManage={canManagePeriod}
              partnerDisplayName={dashboardData.ownerDisplayName}
              onPeriodUpdated={() => {
                refreshPeriod()
                if (categories.includes("cycle_estimates")) refreshEstimates()
              }}
            />
          )}

          {/* Cycle Preferences */}
          {categories.includes("cycle_preferences") && cyclePreferences && (
            <CyclePreferencesCard
              data={cyclePreferences}
              canManage={canManageCyclePrefs}
              partnerDisplayName={dashboardData.ownerDisplayName}
              onPreferencesUpdated={() => {
                refreshCyclePreferences()
                if (categories.includes("cycle_estimates")) refreshEstimates()
              }}
            />
          )}

          {/* Daily Notes */}
          {categories.includes("daily_notes") && dailyNotes && (
            <DailyNotesCard
              data={dailyNotes}
              canManage={canManageDailyNotes}
              partnerDisplayName={dashboardData.ownerDisplayName}
              onNotesUpdated={refreshDailyNotes}
            />
          )}
        </div>
      )}

      {/* Privacy Footer */}
      <div className="flex items-center gap-2 px-1 pt-2 text-[10px] text-muted-foreground/70">
        <ShieldCheck className="size-3 shrink-0" />
        <span>Privacy-first • Your partner controls all sharing & co-management permissions</span>
      </div>
    </div>
  )
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function PartnerDashboardHeader() {
  const router = useAppRouter()
  return (
    <div className="space-y-1 select-none">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/settings/partner")}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg -ml-2 cursor-pointer"
        >
          <ChevronLeft className="size-3.5" />
          Partner
        </Button>
      </div>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        Partner Dashboard
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Shared cycle awareness and authorized co-management.
      </p>
    </div>
  )
}

function CycleEstimatesCard({ data }: { data: SharedCycleEstimateResult }) {
  if (!data.ok || !data.data) return null

  const d = data.data
  return (
    <Card className="overflow-hidden border-border/70 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            <Activity className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Cycle Estimates</CardTitle>
            <CardDescription className="text-[11px]">Current cycle overview</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Status */}
        <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <span className={`text-xs font-semibold ${d.isOnPeriod ? "text-rose-500" : "text-foreground"}`}>
              {d.currentCyclePhase}
            </span>
          </div>
          {d.currentCycleDay !== null && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cycle Day</span>
              <span className="text-xs font-bold text-foreground">{d.currentCycleDay}</span>
            </div>
          )}
          {d.cycleProgress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Progress</span>
                <span>{d.cycleProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, d.cycleProgress)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Estimates Grid */}
        <div className="grid grid-cols-2 gap-2">
          {d.estimatedNextPeriodDate && (
            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/20 space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarDays className="size-3" />
                <span>Next Period</span>
              </div>
              <p className="text-xs font-semibold text-foreground">{formatDate(d.estimatedNextPeriodDate)}</p>
              {d.estimatedNextPeriodDaysUntil !== null && (
                <p className="text-[10px] text-primary font-medium">
                  {d.estimatedNextPeriodDaysUntil <= 0
                    ? "Expected today"
                    : `${d.estimatedNextPeriodDaysUntil} day${d.estimatedNextPeriodDaysUntil === 1 ? "" : "s"} away`}
                </p>
              )}
            </div>
          )}
          {d.averageCycleLength !== null && (
            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/20 space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <TrendingUp className="size-3" />
                <span>Avg Cycle</span>
              </div>
              <p className="text-xs font-semibold text-foreground">{d.averageCycleLength} days</p>
            </div>
          )}
          {d.averagePeriodDuration !== null && (
            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/20 space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="size-3" />
                <span>Avg Period</span>
              </div>
              <p className="text-xs font-semibold text-foreground">{d.averagePeriodDuration} days</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PeriodStatusCard({
  data,
  canManage = false,
  partnerDisplayName,
  onPeriodUpdated,
}: {
  data: SharedPeriodStatusResult
  canManage?: boolean
  partnerDisplayName?: string
  onPeriodUpdated: () => void
}) {
  const [modalOpen, setModalOpen] = React.useState(false)

  if (!data.ok || !data.data) return null

  const d = data.data
  return (
    <>
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20">
                <Droplets className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Period Status</CardTitle>
                <CardDescription className="text-[11px]">Current period information</CardDescription>
              </div>
            </div>

            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(true)}
                className="h-8 px-2.5 text-xs gap-1.5 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer font-medium"
              >
                <Plus className="size-3.5" />
                <span>Manage Period</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Currently on period</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 font-medium ${
                  d.isOnPeriod
                    ? "border-rose-500/40 text-rose-500 bg-rose-500/10"
                    : "border-border/60 text-muted-foreground"
                }`}
              >
                {d.isOnPeriod ? "Yes" : "No"}
              </Badge>
            </div>
            {d.isOnPeriod && d.currentPeriodDay !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Period Day</span>
                <span className="text-xs font-bold text-foreground">{d.currentPeriodDay}</span>
              </div>
            )}
            {d.lastPeriodStartDate && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Last Period</span>
                <span className="text-xs font-medium text-foreground">{formatDate(d.lastPeriodStartDate)}</span>
              </div>
            )}
            {d.lastPeriodDuration !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Duration</span>
                <span className="text-xs font-medium text-foreground">{d.lastPeriodDuration} days</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <ManagePeriodDialog
          open={modalOpen}
          onOpenChange={setModalOpen}
          partnerDisplayName={partnerDisplayName}
          onSuccess={onPeriodUpdated}
        />
      )}
    </>
  )
}

function CyclePreferencesCard({
  data,
  canManage = false,
  partnerDisplayName,
  onPreferencesUpdated,
}: {
  data: SharedCyclePreferencesResult
  canManage?: boolean
  partnerDisplayName?: string
  onPreferencesUpdated: () => void
}) {
  const [modalOpen, setModalOpen] = React.useState(false)

  if (!data.ok || !data.data) return null

  const d = data.data
  return (
    <>
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                <Settings2 className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Cycle Preferences</CardTitle>
                <CardDescription className="text-[11px]">Shared cycle configuration</CardDescription>
              </div>
            </div>

            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(true)}
                className="h-8 px-2.5 text-xs gap-1.5 rounded-xl border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer font-medium"
              >
                <Edit3 className="size-3.5" />
                <span>Edit</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-2">
            {d.typicalCycleLength !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Typical Cycle Length</span>
                <span className="text-xs font-bold text-foreground">{d.typicalCycleLength} days</span>
              </div>
            )}
            {d.lastPeriodStart && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Last Period Start</span>
                <span className="text-xs font-medium text-foreground">{formatDate(d.lastPeriodStart)}</span>
              </div>
            )}
            {d.typicalCycleLength === null && !d.lastPeriodStart && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No cycle preferences data available.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <EditCyclePreferencesDialog
          open={modalOpen}
          onOpenChange={setModalOpen}
          initialTypicalLength={d.typicalCycleLength}
          initialLastPeriodStart={d.lastPeriodStart}
          partnerDisplayName={partnerDisplayName}
          onSuccess={onPreferencesUpdated}
        />
      )}
    </>
  )
}

function DailyNotesCard({
  data,
  canManage = false,
  partnerDisplayName,
  onNotesUpdated,
}: {
  data: SharedDailyNotesResult
  canManage?: boolean
  partnerDisplayName?: string
  onNotesUpdated: () => void
}) {
  const [addModalOpen, setAddModalOpen] = React.useState(false)
  const [deletePendingDate, setDeletePendingDate] = React.useState<string | null>(null)

  if (!data.ok || !data.data) return null

  const notes = data.data

  const handleDelete = async (date: string) => {
    if (!confirm(`Delete partner daily note for ${date}?`)) return
    setDeletePendingDate(date)
    try {
      const res = await deletePartnerDailyNoteAction({ date })
      if (res.ok) {
        onNotesUpdated()
      } else {
        alert(res.error || "Failed to delete note.")
      }
    } finally {
      setDeletePendingDate(null)
    }
  }

  return (
    <>
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <BookOpen className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Daily Notes</CardTitle>
                <CardDescription className="text-[11px]">
                  {notes.length > 0 ? `${notes.length} shared note${notes.length === 1 ? "" : "s"}` : "No notes shared"}
                </CardDescription>
              </div>
            </div>

            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className="h-8 px-2.5 text-xs gap-1.5 rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer font-medium"
              >
                <Plus className="size-3.5" />
                <span>Add Note</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="p-4 rounded-xl bg-secondary/20 text-center">
              <p className="text-xs text-muted-foreground">No daily notes to display.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notes.slice(0, 15).map((note) => (
                <div
                  key={note.date}
                  className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1 relative group"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {formatDate(note.date)}
                    </p>
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletePendingDate === note.date}
                        onClick={() => handleDelete(note.date)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive rounded-md cursor-pointer"
                        aria-label={`Delete note for ${note.date}`}
                      >
                        {deletePendingDate === note.date ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                </div>
              ))}
              {notes.length > 15 && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  Showing 15 of {notes.length} notes
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <AddDailyNoteDialog
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          partnerDisplayName={partnerDisplayName}
          onSuccess={onNotesUpdated}
        />
      )}
    </>
  )
}

// ─── Modal Dialogs for Co-Management ─────────────────────────────────────────

function ManagePeriodDialog({
  open,
  onOpenChange,
  partnerDisplayName,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerDisplayName?: string
  onSuccess: () => void
}) {
  const todayStr = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = React.useState(todayStr)
  const [endDate, setEndDate] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)
    setSuccess(false)

    try {
      const res = await recordPartnerPeriodAction({
        startDate,
        endDate: endDate ? endDate : null,
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          onSuccess()
          setSuccess(false)
        }, 800)
      } else {
        setErrorMsg(res.error || "Failed to log period.")
      }
    } catch {
      setErrorMsg("Network error saving period record.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold">Log Period for Partner</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Record period start and optional end date for {partnerDisplayName || "partner"}.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="flex items-center justify-center py-6 gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
            <Check className="size-4" />
            <span>Period recorded successfully!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Period Start Date</Label>
              <Input
                type="date"
                max={todayStr}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Period End Date (Optional)</Label>
              <Input
                type="date"
                max={todayStr}
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Leave empty if period is currently ongoing.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
                className="flex-1 h-10 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !startDate}
                className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Period</span>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditCyclePreferencesDialog({
  open,
  onOpenChange,
  initialTypicalLength,
  initialLastPeriodStart,
  partnerDisplayName,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTypicalLength: number | null
  initialLastPeriodStart: string | null
  partnerDisplayName?: string
  onSuccess: () => void
}) {
  const todayStr = new Date().toISOString().split("T")[0]
  const [typicalLength, setTypicalLength] = React.useState<number>(initialTypicalLength || 28)
  const [lastPeriodStart, setLastPeriodStart] = React.useState<string>(initialLastPeriodStart || "")
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  React.useEffect(() => {
    if (initialTypicalLength) setTypicalLength(initialTypicalLength)
    if (initialLastPeriodStart) setLastPeriodStart(initialLastPeriodStart)
  }, [initialTypicalLength, initialLastPeriodStart])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)
    setSuccess(false)

    try {
      const res = await updatePartnerCyclePreferencesAction({
        typicalCycleLength: typicalLength,
        lastPeriodStart: lastPeriodStart ? lastPeriodStart : null,
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          onSuccess()
          setSuccess(false)
        }, 800)
      } else {
        setErrorMsg(res.error || "Failed to update cycle preferences.")
      }
    } catch {
      setErrorMsg("Network error saving cycle preferences.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold">Edit Cycle Preferences</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update cycle configuration baseline for {partnerDisplayName || "partner"}.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="flex items-center justify-center py-6 gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
            <Check className="size-4" />
            <span>Preferences updated!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium">Typical Cycle Length</Label>
                <span className="text-xs font-bold text-foreground font-mono">{typicalLength} days</span>
              </div>
              <Input
                type="number"
                min={21}
                max={45}
                value={typicalLength}
                onChange={(e) => setTypicalLength(Number(e.target.value))}
                required
                className="h-10 text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">Must be between 21 and 45 days.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Last Period Start Date</Label>
              <Input
                type="date"
                max={todayStr}
                value={lastPeriodStart}
                onChange={(e) => setLastPeriodStart(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
                className="flex-1 h-10 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Preferences</span>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddDailyNoteDialog({
  open,
  onOpenChange,
  partnerDisplayName,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerDisplayName?: string
  onSuccess: () => void
}) {
  const todayStr = new Date().toISOString().split("T")[0]
  const [date, setDate] = React.useState(todayStr)
  const [content, setContent] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)
    setSuccess(false)

    try {
      const res = await createPartnerDailyNoteAction({ date, content })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          setContent("")
          onSuccess()
          setSuccess(false)
        }, 800)
      } else {
        setErrorMsg(res.error || "Failed to create daily note.")
      }
    } catch {
      setErrorMsg("Network error saving daily note.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold">Add Daily Note</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create a shared note for {partnerDisplayName || "partner"}.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="flex items-center justify-center py-6 gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
            <Check className="size-4" />
            <span>Daily note saved!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date</Label>
              <Input
                type="date"
                max={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium">Note Content</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {content.length}/5,000
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                maxLength={5000}
                placeholder="Log symptoms, mood, or a helpful reminder..."
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
                className="flex-1 h-10 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !content.trim()}
                className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Add Note</span>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}
