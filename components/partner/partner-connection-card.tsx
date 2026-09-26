"use client"

import * as React from "react"
import { useAppRouter } from "@/components/navigation/use-app-router"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getPartnerConnectionStateAction,
  cancelPartnerInvitationAction,
  acceptPartnerInvitationByIdAction,
  declinePartnerInvitationAction,
} from "@/app/actions/partner"
import type { PartnerConnectionState } from "@/lib/partner/types"
import { AddPartnerModal } from "@/components/partner/add-partner-modal"
import { InvitationCancelledDialog } from "@/components/partner/invitation-cancelled-dialog"
import { PartnerSharingSettingsCard } from "@/components/partner/partner-sharing-settings-card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  HeartHandshake,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  QrCode,
  Copy,
  Check,
  Shield,
  UserCheck,
  Eye,
} from "lucide-react"

interface PartnerConnectionCardProps {
  initialState?: PartnerConnectionState
  onStateChange?: (newState: PartnerConnectionState) => void
}

export function PartnerConnectionCard({
  initialState,
  onStateChange,
}: PartnerConnectionCardProps) {
  const router = useAppRouter()
  const [state, setState] = React.useState<PartnerConnectionState | null>(initialState || null)
  const [loading, setLoading] = React.useState(!initialState)
  const [actionPending, setActionPending] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = React.useState(false)
  const [qrModalOpen, setQrModalOpen] = React.useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = React.useState(false)
  const [cancelledSuccessOpen, setCancelledSuccessOpen] = React.useState(false)
  const [cancelledPartnerInfo, setCancelledPartnerInfo] = React.useState<{
    username?: string | null
    displayName?: string | null
  } | null>(null)

  const fetchState = React.useCallback(async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const res = await getPartnerConnectionStateAction()
      if (res.ok && res.data) {
        setState(res.data)
        if (onStateChange) onStateChange(res.data)
      } else {
        setErrorMsg(res.error || "Failed to load partner connection status.")
      }
    } catch {
      setErrorMsg("Network error loading partner connection.")
    } finally {
      setLoading(false)
    }
  }, [onStateChange])

  React.useEffect(() => {
    if (!initialState) {
      fetchState()
    }

    const handlePartnerChange = () => {
      void fetchState()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("seijun:partner-state-changed", handlePartnerChange)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("seijun:partner-state-changed", handlePartnerChange)
      }
    }
  }, [initialState, fetchState])

  const handleConfirmCancelOutgoing = async () => {
    if (!state?.outgoingInvitation?.id) return
    const partnerInfo = {
      username: state.outgoingInvitation.inviteeUsername || null,
      displayName: state.outgoingInvitation.inviteeDisplayName || null,
    }
    setActionPending(true)
    setErrorMsg(null)
    try {
      const res = await cancelPartnerInvitationAction(state.outgoingInvitation.id)
      if (res.ok) {
        setCancelConfirmOpen(false)
        setCancelledPartnerInfo(partnerInfo)
        setCancelledSuccessOpen(true)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("seijun:partner-state-changed"))
          window.dispatchEvent(new CustomEvent("seijun:notification-update"))
        }
        await fetchState()
      } else {
        setErrorMsg(res.error || "Failed to cancel invitation.")
      }
    } catch {
      setErrorMsg("Error cancelling invitation.")
    } finally {
      setActionPending(false)
    }
  }

  const handleAcceptIncoming = async (invitationId: string) => {
    setActionPending(true)
    setErrorMsg(null)
    try {
      const res = await acceptPartnerInvitationByIdAction(invitationId)
      if (res.ok) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("seijun:partner-state-changed"))
          window.dispatchEvent(new CustomEvent("seijun:notification-update"))
        }
        await fetchState()
      } else {
        setErrorMsg(res.error || "Failed to accept partner invitation.")
      }
    } catch {
      setErrorMsg("Error accepting invitation.")
    } finally {
      setActionPending(false)
    }
  }

  const handleDeclineIncoming = async (invitationId: string) => {
    if (!confirm("Are you sure you want to decline this partner invitation?")) return
    setActionPending(true)
    setErrorMsg(null)
    try {
      const res = await declinePartnerInvitationAction(invitationId)
      if (res.ok) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("seijun:partner-state-changed"))
          window.dispatchEvent(new CustomEvent("seijun:notification-update"))
        }
        await fetchState()
      } else {
        setErrorMsg(res.error || "Failed to decline invitation.")
      }
    } catch {
      setErrorMsg("Error declining invitation.")
    } finally {
      setActionPending(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-border/70 shadow-xs">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  const status = state?.status || "none"

  return (
    <>
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
                <HeartHandshake className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  {status === "active" ? "Connected Partner" : "Partner Connection"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {status === "active"
                    ? "Active partner synchronization"
                    : "Partner relationship management"}
                </CardDescription>
              </div>
            </div>

            {/* Status Badges */}
            {status === "active" && (
              <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-medium border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                Connected
              </Badge>
            )}
            {status === "outgoing_pending" && (
              <Badge variant="lavender" className="text-xs px-2.5 py-0.5 font-normal">
                Invitation Sent
              </Badge>
            )}
            {status === "incoming_pending" && (
              <Badge variant="lavender" className="text-xs px-2.5 py-0.5 font-normal animate-pulse">
                Invitation Received
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STATE 1: NO PARTNER CONNECTED */}
          {status === "none" && (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 text-center space-y-1.5">
                <p className="text-sm font-semibold text-foreground">No partner connected</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Connect with your partner to synchronize cycle awareness respectfully and securely.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="w-full h-11 rounded-xl text-xs gap-2 cursor-pointer font-semibold shadow-xs"
              >
                <UserPlus className="size-4" />
                <span>Add Partner</span>
              </Button>
            </div>
          )}

          {/* STATE 2: OUTGOING PENDING INVITATION */}
          {status === "outgoing_pending" && state?.outgoingInvitation && (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Clock className="size-4 text-primary shrink-0" />
                  <span>Waiting for acceptance</span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Invited partner:</p>
                  <p className="text-sm font-bold text-foreground">
                    {state.outgoingInvitation.inviteeDisplayName || "Partner"}
                  </p>
                  {state.outgoingInvitation.inviteeUsername && (
                    <p className="text-xs font-mono text-primary font-medium">
                      @{state.outgoingInvitation.inviteeUsername}
                    </p>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your invitation is pending. It will remain valid for 7 days.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={actionPending}
                  onClick={() => setCancelConfirmOpen(true)}
                  className="flex-1 h-10 rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-border/70 cursor-pointer"
                >
                  {actionPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <span>Cancel Invitation</span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STATE 3: INCOMING PENDING INVITATION */}
          {status === "incoming_pending" && state?.incomingInvitation && (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <UserCheck className="size-4 shrink-0" />
                  <span>Incoming Partner Invitation</span>
                </div>

                <div>
                  <p className="text-base font-bold text-foreground">
                    {state.incomingInvitation.inviterDisplayName}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    @{state.incomingInvitation.inviterUsername}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Wants to connect with you on Seijun. Accepting links your accounts in a partner relationship.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={actionPending}
                  onClick={() => handleDeclineIncoming(state.incomingInvitation!.id)}
                  className="h-10 rounded-xl text-xs cursor-pointer border-border/70"
                >
                  Decline
                </Button>
                <Button
                  type="button"
                  disabled={actionPending}
                  onClick={() => handleAcceptIncoming(state.incomingInvitation!.id)}
                  className="h-10 rounded-xl text-xs font-semibold cursor-pointer gap-1.5"
                >
                  {actionPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="size-4" />
                      <span>Accept</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STATE 4: ACTIVE RELATIONSHIP */}
          {status === "active" && state?.partner && (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Connected Partner
                  </p>
                  <p className="text-base font-bold text-foreground">
                    {state.partner.displayName}
                  </p>
                  <p className="text-xs font-mono text-primary font-medium">
                    @{state.partner.username}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="size-3.5" />
                  <span>Partner Relationship Active</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary/20 text-xs text-muted-foreground space-y-1 border border-border/30">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Shield className="size-3.5 text-primary" />
                  <span>Privacy-First Sharing</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your cycle insights, journal entries, and private logs remain confidential by default.
                </p>
              </div>

              {/* Partner Dashboard Link — visible for supporters */}
              {state?.relationship?.role === "supporter" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/partner")}
                  className="w-full h-10 rounded-xl text-xs gap-2 cursor-pointer border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Eye className="size-3.5" />
                  <span>View Partner Dashboard</span>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Owner Access & Co-Management Controls */}
      {status === "active" && state?.relationship?.role === "owner" && state.relationship.id && (
        <PartnerSharingSettingsCard
          relationshipId={state.relationship.id}
          partnerDisplayName={state.partner?.displayName}
          partnerUsername={state.partner?.username}
          onRevoked={fetchState}
        />
      )}

      {/* Add Partner Modal */}
      <AddPartnerModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onInvitationSent={fetchState}
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 overflow-hidden">
          <DialogHeader className="text-center space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="size-6 stroke-[2.2]" />
            </div>
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              Cancel Invitation?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to cancel the partner invitation to{" "}
              <span className="font-semibold text-foreground font-mono">
                @{state?.outgoingInvitation?.inviteeUsername || "partner"}
              </span>
              ? They will no longer be able to use the invitation link.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={actionPending}
              onClick={() => setCancelConfirmOpen(false)}
              className="flex-1 h-10 rounded-xl text-xs cursor-pointer"
            >
              Keep Invitation
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={actionPending}
              onClick={handleConfirmCancelOutgoing}
              className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer gap-1.5 shadow-xs"
            >
              {actionPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Yes, Cancel</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal Dialog for Cancelled Invitation */}
      <InvitationCancelledDialog
        open={cancelledSuccessOpen}
        onOpenChange={setCancelledSuccessOpen}
        partnerUsername={cancelledPartnerInfo?.username}
        partnerDisplayName={cancelledPartnerInfo?.displayName}
      />
    </>
  )
}
