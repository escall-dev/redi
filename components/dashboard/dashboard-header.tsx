"use client"

import * as React from "react"

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
      }).toUpperCase()
    : ""

  return (
    <div className="space-y-1 select-none">
      {todayFormatted ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {todayFormatted}
        </p>
      ) : null}

      <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-foreground">
        {greeting}, <span className="font-bold">{displayName}!</span>
      </h1>
    </div>
  )
}


