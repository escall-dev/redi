"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarHeart,
} from "lucide-react"
import {
  calculateRelationshipDuration,
  formatAnniversaryDate,
  getTodayDateString,
  parseCalendarDate,
} from "@/lib/partner/affinity"
import { cn } from "@/lib/utils"

interface AffinityDatePickerProps {
  value?: string // YYYY-MM-DD
  maxDate?: string // YYYY-MM-DD
  max?: string // alias for maxDate
  onChange: (dateStr: string) => void
  className?: string
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const

export function AffinityDatePicker({
  value: selectedDateStr = "",
  maxDate: explicitMaxDate,
  max: aliasMax,
  onChange,
  className,
}: AffinityDatePickerProps) {
  const maxDate = explicitMaxDate || aliasMax || getTodayDateString()
  const todayStr = React.useMemo(() => getTodayDateString(), [])

  // Initialize view year & month from selected date or current date
  const parsedSelected = React.useMemo(
    () => (selectedDateStr ? parseCalendarDate(selectedDateStr) : null),
    [selectedDateStr]
  )
  const parsedToday = React.useMemo(() => parseCalendarDate(todayStr)!, [todayStr])

  const [viewYear, setViewYear] = React.useState<number>(
    parsedSelected ? parsedSelected.year : parsedToday.year
  )
  const [viewMonth, setViewMonth] = React.useState<number>(
    parsedSelected ? parsedSelected.month - 1 : parsedToday.month - 1
  )

  // Mode: "days" | "years" | "months"
  const [pickerMode, setPickerMode] = React.useState<"days" | "years" | "months">("days")

  // Years pagination for years grid (displays 12 years at a time)
  const [yearPageStart, setYearPageStart] = React.useState<number>(() => {
    const initialYear = parsedSelected ? parsedSelected.year : parsedToday.year
    return Math.floor(initialYear / 12) * 12
  })

  // Synchronize calendar view if selectedDateStr changes externally
  const [prevSelectedDateStr, setPrevSelectedDateStr] = React.useState(selectedDateStr)
  if (selectedDateStr !== prevSelectedDateStr) {
    setPrevSelectedDateStr(selectedDateStr)
    if (selectedDateStr) {
      const parsed = parseCalendarDate(selectedDateStr)
      if (parsed) {
        setViewYear(parsed.year)
        setViewMonth(parsed.month - 1)
        setYearPageStart(Math.floor(parsed.year / 12) * 12)
      }
    }
  }

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      // Don't allow navigating into future if next month is in future year
      if (maxDate) {
        const nextMonthStr = `${viewYear + 1}-01-01`
        if (nextMonthStr > maxDate) return
      }
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      if (maxDate) {
        const nextMonthNum = String(viewMonth + 2).padStart(2, "0")
        const nextMonthStr = `${viewYear}-${nextMonthNum}-01`
        if (nextMonthStr > maxDate) return
      }
      setViewMonth((m) => m + 1)
    }
  }

  const handlePrevYear = () => {
    setViewYear((y) => Math.max(1900, y - 1))
  }

  const handleNextYear = () => {
    if (maxDate) {
      const nextYearStr = `${viewYear + 1}-01-01`
      if (nextYearStr > maxDate) return
    }
    setViewYear((y) => y + 1)
  }

  const handleSelectDay = (day: number) => {
    const mStr = String(viewMonth + 1).padStart(2, "0")
    const dStr = String(day).padStart(2, "0")
    const dateStr = `${viewYear}-${mStr}-${dStr}`

    if (maxDate && dateStr > maxDate) return
    onChange(dateStr)
  }

  // Quick Presets
  const handlePreset = (yearsAgo: number) => {
    const now = new Date()
    const target = new Date(now.getFullYear() - yearsAgo, now.getMonth(), now.getDate())
    const y = target.getFullYear()
    const m = String(target.getMonth() + 1).padStart(2, "0")
    const d = String(target.getDate()).padStart(2, "0")
    const dateStr = `${y}-${m}-${d}`

    setViewYear(y)
    setViewMonth(target.getMonth())
    setYearPageStart(Math.floor(y / 12) * 12)
    onChange(dateStr)
  }

  // Days in current month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  // Future disable checks
  const canGoNextMonth = React.useMemo(() => {
    if (!maxDate) return true
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear
    const nextStr = `${nextY}-${String(nextM + 1).padStart(2, "0")}-01`
    return nextStr <= maxDate
  }, [viewYear, viewMonth, maxDate])

  const canGoNextYear = React.useMemo(() => {
    if (!maxDate) return true
    const nextYearStr = `${viewYear + 1}-01-01`
    return nextYearStr <= maxDate
  }, [viewYear, maxDate])

  // Selected date preview metrics
  const previewDuration = React.useMemo(() => {
    if (!selectedDateStr) return null
    return calculateRelationshipDuration(selectedDateStr, todayStr, "detailed")
  }, [selectedDateStr, todayStr])

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/95 p-3.5 sm:p-4 shadow-sm select-none transition-all",
        className
      )}
    >
      {/* Quick Presets Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-2 border-b border-border/40 scrollbar-none">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
          Presets:
        </span>
        <button
          type="button"
          onClick={() => handlePreset(0)}
          className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors shrink-0 cursor-pointer",
            selectedDateStr === todayStr
              ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-semibold"
              : "border-border/60 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
          )}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => handlePreset(1)}
          className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border/60 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
        >
          1 Year Ago
        </button>
        <button
          type="button"
          onClick={() => handlePreset(2)}
          className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border/60 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
        >
          2 Years Ago
        </button>
        <button
          type="button"
          onClick={() => handlePreset(3)}
          className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border/60 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
        >
          3 Years Ago
        </button>
        <button
          type="button"
          onClick={() => handlePreset(5)}
          className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border/60 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
        >
          5 Years Ago
        </button>
      </div>

      {/* Navigation Header Bar */}
      <div className="flex items-center justify-between gap-1 mb-3">
        {/* Fast Year Backward Buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handlePrevYear}
            aria-label="Previous year"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
            title="Previous year (-1 yr)"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
            title="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        {/* Clickable Month & Year Header to toggle Month/Year picker view */}
        <button
          type="button"
          onClick={() => setPickerMode((m) => (m === "days" ? "years" : "days"))}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-bold text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          title="Click to jump to another year/month"
        >
          <span>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 font-normal border-primary/30 text-primary"
          >
            {pickerMode === "days" ? "Change Year" : "Calendar"}
          </Badge>
        </button>

        {/* Fast Year Forward Buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!canGoNextMonth}
            onClick={handleNextMonth}
            aria-label="Next month"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20"
            title="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!canGoNextYear}
            onClick={handleNextYear}
            aria-label="Next year"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20"
            title="Next year (+1 yr)"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* VIEW 1: REGULAR DAYS CALENDAR */}
      {pickerMode === "days" && (
        <>
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEK_DAYS.map((wd, idx) => (
              <span
                key={wd}
                className={cn(
                  "text-[10px] font-semibold py-0.5",
                  idx === 0 || idx === 6 ? "text-rose-500/70" : "text-muted-foreground"
                )}
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank offset placeholders */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="size-8 sm:size-9" />
            ))}

            {/* Month Day Buttons */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const mStr = String(viewMonth + 1).padStart(2, "0")
              const dStr = String(day).padStart(2, "0")
              const dayDateStr = `${viewYear}-${mStr}-${dStr}`

              const isSelected = selectedDateStr === dayDateStr
              const isToday = todayStr === dayDateStr
              const isFuture = Boolean(maxDate && dayDateStr > maxDate)

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isFuture}
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "flex size-8 sm:size-9 items-center justify-center rounded-xl text-xs font-medium transition-all select-none cursor-pointer relative",
                    isSelected
                      ? "bg-rose-500 text-white font-bold shadow-sm shadow-rose-500/25 scale-[1.05]"
                      : "text-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 active:scale-95",
                    isToday && !isSelected && "border-2 border-primary/50 text-primary font-bold",
                    isFuture && "pointer-events-none opacity-20 text-muted-foreground"
                  )}
                  aria-label={`${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}`}
                >
                  <span>{day}</span>
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* VIEW 2: FAST YEAR / MONTH QUICK JUMP GRID */}
      {pickerMode === "years" && (
        <div className="space-y-3 py-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-semibold text-foreground">Select Year</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setYearPageStart((y) => Math.max(1900, y - 12))}
                className="size-6 rounded-md"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-[11px] font-mono">
                {yearPageStart} - {Math.min(parsedToday.year, yearPageStart + 11)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={yearPageStart + 12 > parsedToday.year}
                onClick={() => setYearPageStart((y) => y + 12)}
                className="size-6 rounded-md disabled:opacity-20"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center">
            {Array.from({ length: 12 }).map((_, i) => {
              const yr = yearPageStart + i
              const isFutureYear = yr > parsedToday.year
              const isSelectedYear = viewYear === yr

              return (
                <button
                  key={yr}
                  type="button"
                  disabled={isFutureYear}
                  onClick={() => {
                    setViewYear(yr)
                    setPickerMode("months")
                  }}
                  className={cn(
                    "py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
                    isSelectedYear
                      ? "bg-rose-500 text-white font-bold shadow-xs"
                      : "text-foreground hover:bg-secondary/70",
                    isFutureYear && "opacity-20 pointer-events-none"
                  )}
                >
                  {yr}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: FAST MONTH SELECTOR */}
      {pickerMode === "months" && (
        <div className="space-y-3 py-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-semibold text-foreground">
              Select Month for <span className="text-primary font-bold">{viewYear}</span>
            </span>
            <button
              type="button"
              onClick={() => setPickerMode("years")}
              className="text-[11px] text-primary hover:underline cursor-pointer"
            >
              Change Year
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {MONTH_NAMES.map((name, mIdx) => {
              const monthStr = `${viewYear}-${String(mIdx + 1).padStart(2, "0")}-01`
              const isFutureMonth = Boolean(maxDate && monthStr > maxDate)
              const isSelectedMonth = viewMonth === mIdx

              return (
                <button
                  key={name}
                  type="button"
                  disabled={isFutureMonth}
                  onClick={() => {
                    setViewMonth(mIdx)
                    setPickerMode("days")
                  }}
                  className={cn(
                    "py-2 px-2 rounded-xl text-xs font-medium transition-colors cursor-pointer truncate",
                    isSelectedMonth
                      ? "bg-rose-500 text-white font-bold shadow-xs"
                      : "text-foreground hover:bg-secondary/70",
                    isFutureMonth && "opacity-20 pointer-events-none"
                  )}
                >
                  {name.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Live Selected Date Preview Strip */}
      {selectedDateStr && previewDuration && !previewDuration.isFuture && (
        <div className="mt-3.5 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
            <CalendarHeart className="size-3.5 text-rose-500 shrink-0" />
            <span className="truncate font-medium text-foreground">
              {formatAnniversaryDate(selectedDateStr)}
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] px-2 py-0 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5 font-semibold shrink-0"
          >
            {previewDuration.isToday ? "Started Today" : previewDuration.formattedText}
          </Badge>
        </div>
      )}
    </div>
  )
}
