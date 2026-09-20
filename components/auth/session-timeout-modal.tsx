"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import { formatCountdown } from "@/lib/auth/session-timeout-constants"

export interface SessionTimeoutModalProps {
  isOpen: boolean
  remainingMs: number
  onStayLoggedIn: () => void
}

export function SessionTimeoutModal({
  isOpen,
  remainingMs,
  onStayLoggedIn,
}: SessionTimeoutModalProps) {
  const formattedTime = formatCountdown(remainingMs)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onStayLoggedIn()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm w-[calc(100%-2rem)] p-6 rounded-3xl border border-lavender-border/80 bg-card/95 backdrop-blur-md shadow-redi-lg text-center gap-4 animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Icon & Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-lavender text-primary border border-lavender-border shadow-2xs mb-1">
            <Clock className="size-7 stroke-[2.2] animate-pulse" />
          </div>

          <DialogHeader className="text-center items-center gap-1.5">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Session Timeout Warning
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              You&apos;ve been inactive for a while. You will be logged out in:
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Dynamic Countdown Display */}
        <div
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Time remaining: ${formattedTime}`}
          className="flex flex-col items-center justify-center py-4 px-6 rounded-2xl bg-lavender/30 dark:bg-primary/10 border border-lavender-border/70 dark:border-primary/20 shadow-inner"
        >
          <span className="text-4xl sm:text-5xl font-mono font-bold tracking-wider text-primary select-none tabular-nums">
            {formattedTime}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-1">
            Minutes Remaining
          </span>
        </div>

        {/* Accessible Helper Explanation */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Move your cursor, touch your screen, or click the button below to keep your session active.
        </p>

        {/* Primary Action Button */}
        <DialogFooter className="sm:justify-center pt-1">
          <Button
            type="button"
            onClick={onStayLoggedIn}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md active:scale-98 transition-all h-12 text-base rounded-2xl cursor-pointer"
          >
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
