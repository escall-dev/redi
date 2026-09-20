"use client"

import * as React from "react"
import { Sparkles, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface DashboardHeaderProps {
  displayName: string
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function DashboardHeader({ displayName }: DashboardHeaderProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const greeting = mounted ? getTimeOfDayGreeting() : "Welcome"
  const todayFormatted = mounted
    ? new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : ""

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant="lavender" className="gap-1 font-normal text-xs px-2.5 py-0.5">
          <Sparkles className="size-3" />
          <span>Home</span>
        </Badge>
        {todayFormatted ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 text-muted-foreground/70" />
            <span>{todayFormatted}</span>
          </div>
        ) : null}
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        {greeting}, {displayName}
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Here is your cycle overview and personal health summary.
      </p>
    </div>
  )
}

