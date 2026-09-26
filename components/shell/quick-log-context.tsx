"use client"

import * as React from "react"
import { useAppRouter } from "@/components/navigation/use-app-router"
import { PeriodLogDialog } from "@/components/cycles/period-log-dialog"
import { ManagePeriodDialog } from "@/components/partner/manage-period-dialog"
import { useCycleContext } from "@/lib/cycle-context/cycle-context"

interface QuickLogContextValue {
  openQuickLog: () => void
  canQuickLog: boolean
  isPartnerMode: boolean
  partnerDisplayName?: string
}

const QuickLogContext = React.createContext<QuickLogContextValue | null>(null)

export function QuickLogProvider({ children }: { children: React.ReactNode }) {
  const [personalOpen, setPersonalOpen] = React.useState(false)
  const [partnerOpen, setPartnerOpen] = React.useState(false)
  const router = useAppRouter()

  const { context } = useCycleContext()
  const { isPartnerContext, permissions, partnerInfo, usageRole } = context

  // Supporter can only log period if manage_period_status is granted
  // Cycle tracker can always log their own period
  const canQuickLog = isPartnerContext
    ? permissions.canManagePeriod
    : usageRole !== "supporter"

  const openQuickLog = React.useCallback(() => {
    if (isPartnerContext) {
      if (permissions.canManagePeriod) {
        setPartnerOpen(true)
      }
    } else {
      if (usageRole !== "supporter") {
        setPersonalOpen(true)
      }
    }
  }, [isPartnerContext, permissions.canManagePeriod, usageRole])

  const handlePersonalSuccess = (cycleId?: string) => {
    router.refresh()
    if (cycleId) {
      router.push(`/cycles/${cycleId}`)
    }
  }

  const handlePartnerSuccess = () => {
    router.refresh()
  }

  return (
    <QuickLogContext.Provider
      value={{
        openQuickLog,
        canQuickLog,
        isPartnerMode: isPartnerContext,
        partnerDisplayName: partnerInfo.displayName || "Partner",
      }}
    >
      {children}

      {/* Personal Period Log Dialog (Own Cycle Context) */}
      <PeriodLogDialog
        open={personalOpen}
        onOpenChange={setPersonalOpen}
        onSuccess={handlePersonalSuccess}
      />

      {/* Partner Period Co-Management Dialog (Partner Context) */}
      <ManagePeriodDialog
        open={partnerOpen}
        onOpenChange={setPartnerOpen}
        partnerDisplayName={partnerInfo.displayName || "partner"}
        onSuccess={handlePartnerSuccess}
      />
    </QuickLogContext.Provider>
  )
}

export function useQuickLog() {
  const context = React.useContext(QuickLogContext)
  if (!context) {
    throw new Error("useQuickLog must be used within a QuickLogProvider")
  }
  return context
}
