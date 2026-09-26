"use client"

import * as React from "react"
import Link from "next/link"
import { useQuickLog } from "@/components/shell/quick-log-context"
import { useCycleContext } from "@/lib/cycle-context/cycle-context"
import {
  Plus,
  Calendar,
  History,
  ArrowRight,
  Droplets,
  HeartHandshake,
  BookOpen,
} from "lucide-react"

export function DashboardQuickActions() {
  const { openQuickLog, canQuickLog } = useQuickLog()
  const { context } = useCycleContext()
  const { isPartnerContext, partnerInfo } = context
  const partnerName = partnerInfo.displayName || "Partner"

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        {isPartnerContext ? "Partner Actions" : "Quick Actions"}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Primary Action: Log Period / Manage Period / Partner Settings */}
        {isPartnerContext ? (
          canQuickLog ? (
            <button
              type="button"
              onClick={openQuickLog}
              className="group flex items-center justify-between p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/50 transition-all text-left shadow-redi-card hover:shadow-redi-card-hover active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
                  <Droplets className="size-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground block">
                    Manage Period
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Record period for {partnerName}
                  </span>
                </div>
              </div>
              <ArrowRight className="size-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <Link
              href="/settings/partner"
              className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 dark:border-border/60 bg-card hover:border-primary/40 shadow-redi-card hover:shadow-redi-card-hover transition-all text-left active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
                  <HeartHandshake className="size-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground block">
                    Partner Settings
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Connected with {partnerName}
                  </span>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
            </Link>
          )
        ) : (
          <button
            type="button"
            onClick={openQuickLog}
            className="group flex items-center justify-between p-4 rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 hover:border-primary/45 transition-all text-left shadow-redi-card hover:shadow-redi-card-hover active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <Plus className="size-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block">
                  Log Period
                </span>
                <span className="text-xs text-muted-foreground">
                  Record period days
                </span>
              </div>
            </div>
            <ArrowRight className="size-4 text-primary group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* 2. View Calendar */}
        <Link
          href="/calendar"
          className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 dark:border-border/60 bg-card hover:border-primary/40 shadow-redi-card hover:shadow-redi-card-hover transition-all text-left active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <Calendar className="size-4" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground block">
                {isPartnerContext ? "Partner Calendar" : "View Calendar"}
              </span>
              <span className="text-xs text-muted-foreground">
                {isPartnerContext ? `Timeline for ${partnerName}` : "Monthly dates & view"}
              </span>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
        </Link>

        {/* 3. View Cycle History / Partner Notes */}
        {isPartnerContext ? (
          <Link
            href="/notes"
            className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 dark:border-border/60 bg-card hover:border-primary/40 shadow-redi-card hover:shadow-redi-card-hover transition-all text-left active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
                <BookOpen className="size-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block">
                  Partner Notes
                </span>
                <span className="text-xs text-muted-foreground">
                  Shared daily reflections
                </span>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
          </Link>
        ) : (
          <Link
            href="/cycles"
            className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 dark:border-border/60 bg-card hover:border-primary/40 shadow-redi-card hover:shadow-redi-card-hover transition-all text-left active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
                <History className="size-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block">
                  Cycle History
                </span>
                <span className="text-xs text-muted-foreground">
                  All recorded cycles
                </span>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
          </Link>
        )}
      </div>
    </div>
  )
}
