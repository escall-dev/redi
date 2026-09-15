"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

interface DatePickerProps {
  id?: string
  name?: string
  value?: string // YYYY-MM-DD
  defaultValue?: string // YYYY-MM-DD
  onChange?: (date: string) => void
  maxDate?: string // YYYY-MM-DD (e.g. today)
  placeholder?: string
  className?: string
  disabled?: boolean
}

function formatDateDisplay(isoString: string): string {
  if (!isoString) return ""
  const [year, month, day] = isoString.split("-").map(Number)
  if (!year || !month || !day) return ""
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function DatePicker({
  id,
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  maxDate,
  placeholder = "Select date",
  className,
  disabled = false,
}: DatePickerProps) {
  const [internalValue, setInternalValue] = React.useState<string>(
    defaultValue || ""
  )
  const isControlled = controlledValue !== undefined
  const selectedDateStr = isControlled ? controlledValue : internalValue

  const [isOpen, setIsOpen] = React.useState(false)

  // Calendar navigation state (current view month & year)
  const initialDate = selectedDateStr ? new Date(selectedDateStr + "T00:00:00") : new Date()
  const [viewYear, setViewYear] = React.useState(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = React.useState(initialDate.getMonth())

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, "0")
    const formattedDay = String(day).padStart(2, "0")
    const dateStr = `${viewYear}-${formattedMonth}-${formattedDay}`

    if (maxDate && dateStr > maxDate) {
      return
    }

    if (!isControlled) {
      setInternalValue(dateStr)
    }
    onChange?.(dateStr)
    setIsOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  // Days calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <div className={cn("relative w-full", className)}>
      {/* Hidden input for form data */}
      {name && (
        <input
          type="hidden"
          id={id}
          name={name}
          value={selectedDateStr}
        />
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "flex h-11 sm:h-10 w-full items-center justify-between rounded-xl border border-border/80 bg-card px-3.5 text-sm text-foreground transition-all outline-none select-none hover:border-primary/40 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-50",
                !selectedDateStr && "text-muted-foreground",
                isOpen && "border-primary ring-3 ring-primary/15"
              )}
            />
          }
        >
          <span>{selectedDateStr ? formatDateDisplay(selectedDateStr) : placeholder}</span>
          <CalendarIcon className="size-4 text-muted-foreground shrink-0 ml-2" />
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[280px] p-3 rounded-2xl border-border/80 shadow-redi-lg bg-card"
        >
          {/* Header Month / Year controls */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground px-1">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={prevMonth}
                aria-label="Previous month"
                className="size-7 rounded-lg"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={nextMonth}
                aria-label="Next month"
                className="size-7 rounded-lg"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekDays.map((wd) => (
              <span
                key={wd}
                className="text-[11px] font-medium text-muted-foreground py-1"
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank offset days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="size-8" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const formattedMonth = String(viewMonth + 1).padStart(2, "0")
              const formattedDay = String(day).padStart(2, "0")
              const currentDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`

              const isSelected = selectedDateStr === currentDateStr
              const isToday = todayStr === currentDateStr
              const isFutureDisabled = Boolean(maxDate && currentDateStr > maxDate)

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isFutureDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-medium transition-all select-none cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-foreground hover:bg-lavender hover:text-primary",
                    isToday && !isSelected && "border border-primary/40 text-primary font-semibold",
                    isFutureDisabled && "pointer-events-none opacity-25"
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
