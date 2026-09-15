"use client"

import * as React from "react"
import Link from "next/link"
import { useQuickLog } from "@/components/shell/quick-log-context"
import { Plus, Calendar, History, ArrowRight } from "lucide-react"

export function DashboardQuickActions() {
  const { openQuickLog } = useQuickLog()

  return (
    <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Log Period (Primary Action) */}
          <button
            type="button"
            onClick={openQuickLog}
            className="group flex items-center justify-between p-4 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all text-left shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <Plus className="size-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block">Log Period</span>
                <span className="text-xs text-muted-foreground">Record period days</span>
              </div>
            </div>
            <ArrowRight className="size-4 text-primary group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* 2. View Calendar */}
          <Link
            href="/calendar"
            className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/30 hover:shadow-2xs transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
                <Calendar className="size-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block">View Calendar</span>
                <span className="text-xs text-muted-foreground">Monthly dates & view</span>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
          </Link>

          {/* 3. View Cycle History */}
          <Link
            href="/cycles"
            className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/30 hover:shadow-2xs transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
                <History className="size-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block">Cycle History</span>
                <span className="text-xs text-muted-foreground">All recorded cycles</span>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
          </Link>
        </div>
      </div>
  )
}
