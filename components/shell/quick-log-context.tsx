"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PeriodLogDialog } from "@/components/cycles/period-log-dialog"

interface QuickLogContextValue {
  openQuickLog: () => void
}

const QuickLogContext = React.createContext<QuickLogContextValue | null>(null)

export function QuickLogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  const openQuickLog = React.useCallback(() => {
    setOpen(true)
  }, [])

  const handleSuccess = (cycleId?: string) => {
    router.refresh()
    if (cycleId) {
      router.push(`/cycles/${cycleId}`)
    }
  }

  return (
    <QuickLogContext.Provider value={{ openQuickLog }}>
      {children}
      <PeriodLogDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleSuccess}
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
