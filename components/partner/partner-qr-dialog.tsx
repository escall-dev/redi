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
import { generateQrMatrix, generateQrSvgPath } from "@/lib/partner/qr"
import { QrCode, Copy, Check, Shield } from "lucide-react"

interface PartnerQrDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inviteUrl: string
  partnerUsername?: string
}

export function PartnerQrDialog({
  open,
  onOpenChange,
  inviteUrl,
  partnerUsername,
}: PartnerQrDialogProps) {
  const [copied, setCopied] = React.useState(false)

  // Generate QR path memoized
  const qrSvgData = React.useMemo(() => {
    if (!inviteUrl) return null
    try {
      const matrix = generateQrMatrix(inviteUrl)
      const path = generateQrSvgPath(matrix)
      return { size: matrix.length, path }
    } catch {
      return null
    }
  }, [inviteUrl])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-lavender/60 text-primary border border-lavender-border/80">
            <QrCode className="size-6 stroke-[2.2]" />
          </div>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Scan to Connect
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {partnerUsername
              ? `Have @${partnerUsername} scan this QR code with their camera to accept your invitation.`
              : "Have your partner scan this QR code with their camera to accept your invitation."}
          </DialogDescription>
        </DialogHeader>

        {/* QR Code Canvas */}
        <div className="my-4 flex flex-col items-center justify-center">
          <div className="p-4 rounded-2xl bg-white border border-border/80 shadow-md">
            {qrSvgData ? (
              <svg
                viewBox={`0 0 ${qrSvgData.size} ${qrSvgData.size}`}
                className="size-56 w-56 h-56 select-none"
                shapeRendering="crispEdges"
              >
                <path d={qrSvgData.path} fill="#0a0a0a" />
              </svg>
            ) : (
              <div className="size-56 flex items-center justify-center text-xs text-muted-foreground">
                Unable to render QR code
              </div>
            )}
          </div>
        </div>

        {/* Privacy Note & Actions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50 text-[11px] text-muted-foreground border border-border/40">
            <Shield className="size-3.5 text-primary shrink-0" />
            <span>Encodes secure single-use token only. No personal cycle data is shared.</span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="w-full gap-2 rounded-xl text-xs h-10 border-border/80"
          >
            {copied ? (
              <>
                <Check className="size-4 text-emerald-500" />
                <span>Link Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="size-4" />
                <span>Copy Invitation Link</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
