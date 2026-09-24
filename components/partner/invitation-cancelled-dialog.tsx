"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

interface InvitationCancelledDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerUsername?: string | null
  partnerDisplayName?: string | null
  onDone?: () => void
}

export function InvitationCancelledDialog({
  open,
  onOpenChange,
  partnerUsername,
  partnerDisplayName,
  onDone,
}: InvitationCancelledDialogProps) {
  const handleClose = () => {
    onOpenChange(false)
    if (onDone) {
      onDone()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-lavender/60 text-primary border border-lavender-border/80">
            <CheckCircle2 className="size-6 stroke-[2.2]" />
          </div>
          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
            Invitation Cancelled
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {partnerUsername ? (
              <>
                Your partner invitation to{" "}
                <span className="font-semibold text-foreground font-mono">@{partnerUsername}</span>
                {partnerDisplayName ? ` (${partnerDisplayName})` : ""}{" "}
                has been successfully cancelled.
              </>
            ) : (
              "Your partner invitation has been successfully cancelled."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/50 text-[11px] text-muted-foreground space-y-1">
          <p>• The invitation link is no longer valid.</p>
          <p>• No partner synchronization was activated.</p>
          <p>• You can send a fresh invitation at any time.</p>
        </div>

        <Button
          type="button"
          onClick={handleClose}
          className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer bg-primary text-primary-foreground shadow-xs"
        >
          Done
        </Button>
      </DialogContent>
    </Dialog>
  )
}
