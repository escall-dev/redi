"use client"

import * as React from "react"

interface DashboardHeaderProps {
  displayName: string
  partnerDisplayName?: string | null
  hasActivePartner?: boolean
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function DashboardHeader({
  displayName,
  partnerDisplayName,
  hasActivePartner = false,
}: DashboardHeaderProps) {
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
      }).toUpperCase()
    : ""

  return (
    <div className="space-y-1 select-none">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {todayFormatted ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {todayFormatted}
          </p>
        ) : null}
        {hasActivePartner && partnerDisplayName && (
          <span className="text-[11px] font-medium text-muted-foreground/80 bg-lavender/40 dark:bg-card/60 px-2.5 py-0.5 rounded-full border border-lavender-border/60">
            Connected with {partnerDisplayName}
          </span>
        )}
      </div>

      <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-foreground">
        {greeting}, <span className="font-bold">{displayName}!</span>
      </h1>
    </div>
  )
}


