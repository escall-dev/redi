"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Heart,
  CalendarHeart,
  Sparkles,
  Edit3,
  Clock,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  RotateCcw,
} from "lucide-react"
import {
  calculateRelationshipDuration,
  formatAnniversaryDate,
  getTodayDateString,
  isValidRelationshipDate,
} from "@/lib/partner/affinity"
import {
  updateRelationshipStartDateAction,
  updateAffinityDisplayFormatAction,
} from "@/app/actions/partner"
import {
  AFFINITY_DISPLAY_FORMATS,
  type AffinityDisplayFormat,
  type RelationshipDurationResult,
} from "@/lib/partner/types"
import { AffinityDatePicker } from "@/components/partner/affinity-date-picker"
import { cn } from "@/lib/utils"

interface AffinityCardProps {
  startDate?: string | null
  initialFormat?: AffinityDisplayFormat
  partnerDisplayName?: string
  partnerUsername?: string
  relationshipStatus?: string
  canEdit?: boolean
  className?: string
  onStartDateChange?: (newDate: string | null) => void
  onFormatChange?: (newFormat: AffinityDisplayFormat) => void
}

export function AffinityCard({
  startDate: initialStartDate,
  initialFormat = "detailed",
  partnerDisplayName = "Partner",
  partnerUsername,
  relationshipStatus = "active",
  canEdit = true,
  className,
  onStartDateChange,
  onFormatChange,
}: AffinityCardProps) {
  const [prevInitialStartDate, setPrevInitialStartDate] = React.useState(initialStartDate)
  const [startDate, setStartDate] = React.useState<string | null>(initialStartDate || null)
  const [inputDate, setInputDate] = React.useState(initialStartDate || "")

  if (initialStartDate !== prevInitialStartDate) {
    setPrevInitialStartDate(initialStartDate)
    setStartDate(initialStartDate || null)
    setInputDate(initialStartDate || "")
  }

  const [prevInitialFormat, setPrevInitialFormat] = React.useState(initialFormat)
  const [format, setFormat] = React.useState<AffinityDisplayFormat>(initialFormat)

  if (initialFormat !== prevInitialFormat) {
    setPrevInitialFormat(initialFormat)
    if (initialFormat) {
      setFormat(initialFormat)
    }
  }

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [formatMenuOpen, setFormatMenuOpen] = React.useState(false)

  // Current live date state: recomputed dynamically so duration never goes stale
  const [currentDate, setCurrentDate] = React.useState(() => getTodayDateString())

  React.useEffect(() => {
    // Dynamic recalculation on timer and when window regains visibility/focus
    const updateDate = () => {
      const today = getTodayDateString()
      setCurrentDate((prev) => (prev !== today ? today : prev))
    }

    const interval = setInterval(updateDate, 60000) // check every minute

    const handleFocus = () => updateDate()
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updateDate()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  // Calculate dynamic duration
  const duration: RelationshipDurationResult | null = React.useMemo(() => {
    if (!startDate) return null
    return calculateRelationshipDuration(startDate, currentDate, format)
  }, [startDate, currentDate, format])

  // Open edit dialog
  const handleOpenDialog = () => {
    setInputDate(startDate || "")
    setErrorMsg(null)
    setDialogOpen(true)
  }

  // Handle saving the start date
  const handleSaveStartDate = async (dateToSave: string | null) => {
    setSaving(true)
    setErrorMsg(null)

    if (dateToSave && dateToSave.trim().length > 0) {
      const check = isValidRelationshipDate(dateToSave.trim(), currentDate)
      if (!check.valid) {
        setErrorMsg(check.error || "Please enter a valid date.")
        setSaving(false)
        return
      }
    }

    try {
      const res = await updateRelationshipStartDateAction(dateToSave ? dateToSave.trim() : null)
      if (res.ok) {
        const updated = dateToSave ? dateToSave.trim() : null
        setStartDate(updated)
        if (onStartDateChange) onStartDateChange(updated)
        setDialogOpen(false)

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("seijun:partner-state-changed"))
        }
      } else {
        setErrorMsg(res.error || "Failed to update relationship start date.")
      }
    } catch {
      setErrorMsg("Network error saving relationship start date.")
    } finally {
      setSaving(false)
    }
  }

  // Handle changing display format preference
  const handleSelectFormat = async (newFormat: AffinityDisplayFormat) => {
    setFormat(newFormat)
    setFormatMenuOpen(false)
    if (onFormatChange) onFormatChange(newFormat)

    try {
      await updateAffinityDisplayFormatAction(newFormat)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("seijun:partner-state-changed"))
      }
    } catch {
      // Optimistic state remains responsive
    }
  }

  const isConnected = relationshipStatus === "active"
  const isPending =
    relationshipStatus === "outgoing_pending" ||
    relationshipStatus === "incoming_pending" ||
    relationshipStatus === "pending"

  return (
    <>
      <Card
        className={cn(
          "border-border/70 shadow-xs transition-all duration-200",
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <Heart className="size-5 fill-rose-500/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">Affinity</CardTitle>
                  {isConnected && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-2 py-0 font-medium border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5"
                    >
                      Connected
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {isConnected
                    ? `Time with ${partnerDisplayName}`
                    : "Partner milestone & connection duration"}
                </CardDescription>
              </div>
            </div>

            {/* Live Indicator */}
            {isConnected && startDate && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/50 border border-border/50 text-[10px] text-muted-foreground font-medium">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* STATE 1: CONNECTED WITH START DATE */}
          {isConnected && startDate && duration && (
            <div className="space-y-4">
              {/* Hero Duration Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/10 via-primary/5 to-secondary/30 p-4 sm:p-5 border border-rose-500/20">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium uppercase tracking-wider text-[10px] text-rose-600 dark:text-rose-400">
                      Together For
                    </span>
                    <span className="text-[11px] font-medium">
                      Since {formatAnniversaryDate(startDate)}
                    </span>
                  </div>

                  {/* Main Duration Text */}
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground pt-1 capitalize">
                    {duration.formattedText}
                  </h3>

                  {/* Secondary Metrics / Milestone */}
                  {duration.secondaryLabel && (
                    <p className="text-xs text-muted-foreground pt-0.5">
                      {duration.secondaryLabel}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Bar: Edit Date & Format Preference */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {/* Format Dropdown via Portaled Popover */}
                <Popover open={formatMenuOpen} onOpenChange={setFormatMenuOpen}>
                  <PopoverTrigger
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 px-2.5 rounded-lg border border-border/60 hover:bg-secondary/40 transition-colors cursor-pointer"
                    aria-label="Change duration format"
                  >
                    <Clock className="size-3.5 text-primary" />
                    <span className="font-medium">
                      {AFFINITY_DISPLAY_FORMATS.find((f) => f.id === format)?.label || "Format"}
                    </span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </PopoverTrigger>

                  <PopoverContent
                    align="start"
                    side="bottom"
                    sideOffset={6}
                    className="w-56 p-1.5 rounded-xl border border-border/70 bg-popover shadow-lg z-50"
                  >
                    <p className="px-2 py-1 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                      Display Format
                    </p>
                    <div className="space-y-0.5">
                      {AFFINITY_DISPLAY_FORMATS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            handleSelectFormat(f.id)
                            setFormatMenuOpen(false)
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left cursor-pointer transition-colors",
                            format === f.id
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-secondary/60"
                          )}
                        >
                          <div>
                            <p className="leading-none">{f.label}</p>
                            <p className="text-[10px] text-muted-foreground pt-0.5">
                              {f.description}
                            </p>
                          </div>
                          {format === f.id && <Check className="size-3.5 shrink-0 ml-2" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Edit Date Button */}
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenDialog}
                    className="h-8 rounded-lg text-xs gap-1.5 border-border/60 hover:bg-secondary/40 cursor-pointer"
                  >
                    <Edit3 className="size-3" />
                    <span>Change Date</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* STATE 2: CONNECTED WITHOUT START DATE */}
          {isConnected && !startDate && (
            <div className="space-y-3 pt-1">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 text-center space-y-1.5">
                <div className="mx-auto flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarHeart className="size-4.5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Record your relationship start date
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Set your anniversary or start date with {partnerDisplayName} to celebrate milestones
                  and dynamically track your journey together.
                </p>
              </div>

              {canEdit && (
                <Button
                  type="button"
                  onClick={handleOpenDialog}
                  className="w-full h-10 rounded-xl text-xs gap-2 cursor-pointer font-semibold shadow-xs"
                >
                  <CalendarHeart className="size-4" />
                  <span>Set Start Date</span>
                </Button>
              )}
            </div>
          )}

          {/* STATE 3: PENDING RELATIONSHIP */}
          {isPending && (
            <div className="p-4 rounded-2xl bg-secondary/25 border border-border/40 space-y-1.5 text-center">
              <div className="mx-auto flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="size-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">Affinity Pending Connection</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Affinity milestones and duration tracking will activate once the partner invitation is
                accepted.
              </p>
            </div>
          )}

          {/* STATE 4: DISCONNECTED / NONE */}
          {!isConnected && !isPending && (
            <div className="p-3.5 rounded-xl bg-secondary/20 text-xs text-muted-foreground space-y-1 border border-border/30">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                <span>Relationship Milestones</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Connect with a partner to activate shared milestone and relationship duration
                tracking.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Anniversary Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 sm:p-6 overflow-hidden">
          <DialogHeader className="text-center space-y-1.5 pb-1">
            <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <CalendarHeart className="size-5 stroke-[2.2]" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {startDate ? "Edit Relationship Date" : "Set Relationship Date"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Select your anniversary or relationship start date with{" "}
              <span className="font-semibold text-foreground">
                {partnerDisplayName}
                {partnerUsername ? ` (@${partnerUsername})` : ""}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSaveStartDate(inputDate)
            }}
            className="space-y-4 pt-1"
          >
            {errorMsg && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Custom Modern Date Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Anniversary Date
              </Label>
              <AffinityDatePicker
                value={inputDate}
                maxDate={currentDate}
                max={currentDate}
                onChange={(newDate) => {
                  setInputDate(newDate)
                  setErrorMsg(null)
                }}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              {startDate && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => handleSaveStartDate(null)}
                  className="h-10 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/70 cursor-pointer"
                  title="Remove anniversary date"
                >
                  <RotateCcw className="size-3.5" />
                  <span className="sr-only sm:not-sr-only sm:inline-block">Clear</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setDialogOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs cursor-pointer border-border/70"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saving || !inputDate}
                className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer gap-1.5 shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Date</span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
