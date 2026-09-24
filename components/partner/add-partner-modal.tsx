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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  searchPartnerByUsernameAction,
  createPartnerInvitationAction,
  cancelPartnerInvitationAction,
  getPartnerConnectionStateAction,
} from "@/app/actions/partner"
import type { PartnerSearchResult } from "@/lib/partner/types"
import { InvitationCancelledDialog } from "@/components/partner/invitation-cancelled-dialog"
import {
  Search,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Clock,
  XCircle,
} from "lucide-react"

interface AddPartnerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvitationSent?: () => void
}

type ModalStep = "search" | "success"

export function AddPartnerModal({
  open,
  onOpenChange,
  onInvitationSent,
}: AddPartnerModalProps) {
  const [step, setStep] = React.useState<ModalStep>("search")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<PartnerSearchResult[]>([])
  const [hasSearched, setHasSearched] = React.useState(false)
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)

  // Direct sending state
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerSearchResult | null>(null)
  const [isSending, setIsSending] = React.useState(false)
  const [sendingUsername, setSendingUsername] = React.useState<string | null>(null)

  // Created invitation id for cancellation option
  const [createdInvitationId, setCreatedInvitationId] = React.useState<string | null>(null)

  // Outgoing pending invitation state
  const [existingOutgoing, setExistingOutgoing] = React.useState<{
    id: string
    username?: string
    displayName?: string
  } | null>(null)

  // Cancel action states
  const [isCancelling, setIsCancelling] = React.useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = React.useState(false)
  const [cancelledSuccessOpen, setCancelledSuccessOpen] = React.useState(false)
  const [cancelledPartnerInfo, setCancelledPartnerInfo] = React.useState<{
    username?: string | null
    displayName?: string | null
  } | null>(null)

  // Fetch pending invitation on open
  const checkPendingInvitation = React.useCallback(async () => {
    try {
      const res = await getPartnerConnectionStateAction()
      if (res.ok && res.data?.status === "outgoing_pending" && res.data.outgoingInvitation) {
        setExistingOutgoing({
          id: res.data.outgoingInvitation.id,
          username: res.data.outgoingInvitation.inviteeUsername,
          displayName: res.data.outgoingInvitation.inviteeDisplayName,
        })
      } else {
        setExistingOutgoing(null)
      }
    } catch {
      // Ignore background check failure
    }
  }, [])

  // Reset or initialize state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      checkPendingInvitation()
    } else {
      setTimeout(() => {
        setStep("search")
        setSearchQuery("")
        setSearchResults([])
        setHasSearched(false)
        setIsSearching(false)
        setSearchError(null)
        setSelectedPartner(null)
        setIsSending(false)
        setSendingUsername(null)
        setCreatedInvitationId(null)
        setIsCancelling(false)
        setCancelConfirmOpen(false)
      }, 200)
    }
  }, [open, checkPendingInvitation])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const query = searchQuery.trim().replace(/^@+/, "").toLowerCase()
    setSearchError(null)

    if (!query) {
      setSearchError("Please enter a username to search.")
      return
    }

    if (query.length < 2) {
      setSearchError("Please enter at least 2 characters.")
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const res = await searchPartnerByUsernameAction(query)
      if (res.ok && res.data) {
        setSearchResults(res.data)
      } else {
        setSearchError(res.error || "Unable to search for user.")
        setSearchResults([])
      }
    } catch {
      setSearchError("Network error searching for account.")
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Direct 1-click Add Partner handler
  const handleDirectAddPartner = async (partner: PartnerSearchResult) => {
    setSelectedPartner(partner)
    setSendingUsername(partner.username)
    setIsSending(true)
    setSearchError(null)

    try {
      const res = await createPartnerInvitationAction(partner.username)
      if (res.ok && res.data) {
        setCreatedInvitationId(res.data.invitation.id)
        setStep("success")
        if (onInvitationSent) {
          onInvitationSent()
        }
      } else {
        setSearchError(res.error || "Failed to send partner invitation.")
      }
    } catch {
      setSearchError("An unexpected error occurred sending invitation.")
    } finally {
      setIsSending(false)
      setSendingUsername(null)
    }
  }

  // Handle invitation cancellation
  const handleConfirmCancel = async () => {
    const targetInvitationId = createdInvitationId || existingOutgoing?.id
    if (!targetInvitationId) return

    const partnerInfo = {
      username: selectedPartner?.username || existingOutgoing?.username || null,
      displayName: selectedPartner?.displayName || existingOutgoing?.displayName || null,
    }

    setIsCancelling(true)
    try {
      const res = await cancelPartnerInvitationAction(targetInvitationId)
      if (res.ok) {
        setCancelConfirmOpen(false)
        setCancelledPartnerInfo(partnerInfo)
        setCancelledSuccessOpen(true)

        // Reset local invitation state
        setCreatedInvitationId(null)
        setSelectedPartner(null)
        setExistingOutgoing(null)
        setStep("search")
        setSearchError(null)

        if (onInvitationSent) {
          onInvitationSent()
        }
      } else {
        alert(res.error || "Failed to cancel invitation.")
      }
    } catch {
      alert("Network error cancelling invitation.")
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-3xl p-6 overflow-hidden">
          {/* STEP 1: USERNAME SEARCH & DIRECT ADD */}
          {step === "search" && (
            <div className="space-y-5 min-w-0">
              <DialogHeader className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-lavender/60 text-primary border border-lavender-border/80">
                    <UserPlus className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold tracking-tight">
                      Add Partner
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Search by username to connect 1:1 with your partner
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Existing Outgoing Pending Invitation Alert */}
              {existingOutgoing && (
                <div className="p-3.5 rounded-2xl bg-lavender/40 border border-lavender-border/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-primary shrink-0" />
                        <p className="text-xs font-semibold text-foreground">Pending Invitation</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You currently have an invitation sent to{" "}
                        <span className="font-semibold text-foreground font-mono">
                          @{existingOutgoing.username || "partner"}
                        </span>
                        {existingOutgoing.displayName && ` (${existingOutgoing.displayName})`}.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-secondary/80 border-border/60 shrink-0">
                      Pending
                    </Badge>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-lavender-border/40">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setCancelConfirmOpen(true)}
                      className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 cursor-pointer"
                    >
                      <XCircle className="size-3.5" />
                      <span>Cancel Invitation</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Search Form */}
              <form onSubmit={handleSearch} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="partner-search-input" className="text-xs font-medium text-foreground">
                    Partner Username
                  </Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-muted-foreground text-sm font-medium select-none pointer-events-none">
                      @
                    </span>
                    <Input
                      id="partner-search-input"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      value={searchQuery.replace(/^@/, "")}
                      onChange={(e) => setSearchQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="username"
                      className="pl-8 pr-24 h-11 rounded-xl font-mono text-sm"
                      disabled={isSearching || isSending}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSearching || isSending || !searchQuery.trim()}
                      className="absolute right-1.5 h-8 px-3 rounded-lg text-xs gap-1.5 cursor-pointer"
                    >
                      {isSearching ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Search className="size-3.5" />
                      )}
                      <span>Search</span>
                    </Button>
                  </div>
                </div>

                {searchError && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <span>{searchError}</span>
                    </div>
                    {searchError.includes("pending partner invitation") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setCancelConfirmOpen(true)}
                        className="h-7 px-2.5 text-[11px] gap-1 cursor-pointer"
                      >
                        <XCircle className="size-3" />
                        <span>Cancel Existing Invitation</span>
                      </Button>
                    )}
                  </div>
                )}
              </form>

              {/* Search Results */}
              <div className="space-y-2 pt-1">
                {isSearching && (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Searching for @{searchQuery.replace(/^@/, "")}...</span>
                  </div>
                )}

                {!isSearching && hasSearched && searchResults.length === 0 && !searchError && (
                  <div className="text-center py-6 px-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-1">
                    <p className="text-xs font-medium text-foreground">No accounts found</p>
                    <p className="text-[11px] text-muted-foreground">
                      Check spelling or ensure your partner has set up their username in Settings.
                    </p>
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                      Search Results
                    </p>
                    <div className="divide-y divide-border/20 rounded-2xl border border-border/60 overflow-hidden bg-card">
                      {searchResults.map((user) => (
                        <div
                          key={user.username}
                          className="flex items-center justify-between p-3.5 hover:bg-secondary/40 transition-colors"
                        >
                          <div className="min-w-0 pr-3">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {user.displayName}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          </div>
                          {/* Direct Add Partner button */}
                          <Button
                            type="button"
                            size="sm"
                            disabled={isSending}
                            onClick={() => handleDirectAddPartner(user)}
                            className="h-8.5 px-3.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                          >
                            {isSending && sendingUsername === user.username ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                <span>Adding...</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="size-3.5" />
                                <span>Add Partner</span>
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy Footer */}
              <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground border-t border-border/30">
                <Shield className="size-3.5 text-primary shrink-0" />
                <span>Search only exposes minimal public identification (@username & display name).</span>
              </div>
            </div>
          )}

          {/* STEP 2: INVITATION SENT */}
          {step === "success" && selectedPartner && (
            <div className="space-y-5 min-w-0 text-center py-2">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="size-6 stroke-[2.2]" />
              </div>
              <div className="space-y-1.5">
                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                  Invitation Sent
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Invitation sent to{" "}
                  <span className="font-semibold text-foreground font-mono">
                    @{selectedPartner.username}
                  </span>{" "}
                  and is pending acceptance.
                </DialogDescription>
              </div>

              <div className="p-3.5 rounded-2xl bg-secondary/30 text-xs text-muted-foreground border border-border/40 space-y-1">
                <p>
                  @{selectedPartner.username} will receive a notification to review and accept your partner request.
                </p>
              </div>

              {/* Actions: Done & Cancel Option */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer bg-primary text-primary-foreground shadow-xs"
                >
                  Done
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isCancelling}
                  onClick={() => setCancelConfirmOpen(true)}
                  className="w-full h-9 rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer gap-1.5"
                >
                  <XCircle className="size-3.5" />
                  <span>Cancel Invitation</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                @{selectedPartner?.username || existingOutgoing?.username || "partner"}
              </span>
              ? They will no longer be able to use the invitation link.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isCancelling}
              onClick={() => setCancelConfirmOpen(false)}
              className="flex-1 h-10 rounded-xl text-xs cursor-pointer"
            >
              Keep Invitation
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer gap-1.5 shadow-xs"
            >
              {isCancelling ? (
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
