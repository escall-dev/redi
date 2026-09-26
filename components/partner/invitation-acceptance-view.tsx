"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  acceptPartnerInvitationAction,
  declinePartnerInvitationAction,
} from "@/app/actions/partner"
import type { VerifyInvitationResult } from "@/lib/partner/types"
import { cn } from "@/lib/utils"
import { RediLogo } from "@/components/brand/redi-logo"
import {
  HeartHandshake,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Shield,
  Loader2,
  LogIn,
  ArrowRight,
  UserCheck,
} from "lucide-react"

interface InvitationAcceptanceViewProps {
  rawToken: string
  initialVerification: VerifyInvitationResult
  currentUser: { id: string; email?: string } | null
  currentUsername?: string | null
}

export function InvitationAcceptanceView({
  rawToken,
  initialVerification,
  currentUser,
  currentUsername,
}: InvitationAcceptanceViewProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [flowState, setFlowState] = React.useState<"initial" | "accepted" | "declined">("initial")

  const inviter = initialVerification.inviter
  const invitee = initialVerification.invitee

  // Handle Accept
  const handleAccept = async () => {
    setIsPending(true)
    setActionError(null)

    try {
      const res = await acceptPartnerInvitationAction(rawToken)
      if (res.ok) {
        setFlowState("accepted")
      } else {
        setActionError(res.error || "Failed to accept partner invitation.")
      }
    } catch {
      setActionError("A network error occurred while accepting the invitation.")
    } finally {
      setIsPending(false)
    }
  }

  // Handle Decline
  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline this invitation?")) return
    setIsPending(true)
    setActionError(null)

    try {
      const res = await declinePartnerInvitationAction(rawToken)
      if (res.ok) {
        setFlowState("declined")
      } else {
        setActionError(res.error || "Failed to decline invitation.")
      }
    } catch {
      setActionError("A network error occurred while declining the invitation.")
    } finally {
      setIsPending(false)
    }
  }

  // 1. SUCCESS STATE
  if (flowState === "accepted") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-border/80 shadow-redi-card rounded-3xl p-6 sm:p-8 text-center space-y-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="size-8 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Partner Connected
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are now connected with{" "}
              <span className="font-semibold text-foreground">
                {inviter?.displayName || "your partner"}
              </span>{" "}
              on Seijun.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 text-xs text-muted-foreground text-left space-y-1.5 border border-border/40">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Shield className="size-3.5 text-primary" />
              <span>Privacy-First Guarantee</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              All personal cycle estimates, period dates, and notes remain private. Shared insights can be configured together in Partner Settings.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => router.push("/settings/partner")}
            className="w-full h-11 rounded-xl text-xs font-semibold gap-2 cursor-pointer shadow-xs"
          >
            <span>Go to Partner Settings</span>
            <ArrowRight className="size-4" />
          </Button>
        </Card>
      </div>
    )
  }

  // 2. DECLINED STATE
  if (flowState === "declined") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-border/80 shadow-redi-card rounded-3xl p-6 sm:p-8 text-center space-y-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground border border-border/80">
            <XCircle className="size-8 stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Invitation Declined
            </h1>
            <p className="text-sm text-muted-foreground">
              You have declined this partner invitation.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="w-full h-11 rounded-xl text-xs font-medium cursor-pointer"
          >
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  // 3. INVALID OR EXPIRED TOKEN ERROR STATE
  if (!initialVerification.valid) {
    const isExpired = initialVerification.error?.toLowerCase().includes("expired")
    const isAccepted = initialVerification.error?.toLowerCase().includes("already been accepted")

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-border/80 shadow-redi-card rounded-3xl p-6 sm:p-8 text-center space-y-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {isExpired ? <Clock className="size-8" /> : <AlertCircle className="size-8" />}
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isExpired
                ? "Invitation Expired"
                : isAccepted
                ? "Invitation Already Used"
                : "Invalid Partner Invitation"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {initialVerification.error || "This invitation link is not valid or has expired."}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full h-11 rounded-xl text-xs font-medium cursor-pointer"
          >
            Go to Seijun Home
          </Button>
        </Card>
      </div>
    )
  }

  // 4. UNAUTHENTICATED STATE
  if (!currentUser) {
    const loginRedirect = encodeURIComponent(`/partner/invite/${rawToken}`)

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-border/80 shadow-redi-card rounded-3xl p-6 sm:p-8 text-center space-y-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-lavender/60 text-primary border border-lavender-border/80 shadow-xs">
            <HeartHandshake className="size-8 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <Badge variant="lavender" className="px-2.5 py-0.5 text-xs font-normal">
              Partner Invitation
            </Badge>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {inviter?.displayName || "A Seijun user"} wants to connect
            </h1>
            {inviter?.username && (
              <p className="text-xs font-mono text-primary font-medium">
                @{inviter.username}
              </p>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              Please sign in to your Seijun account to review and accept this partner invitation.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Link
              href={`/login?redirect=${loginRedirect}`}
              className={cn(buttonVariants({ variant: "default" }), "w-full h-11 rounded-xl text-xs font-semibold gap-2 shadow-xs")}
            >
              <LogIn className="size-4" />
              <span>Sign In to Continue</span>
            </Link>
            <Link
              href={`/register?redirect=${loginRedirect}`}
              className={cn(buttonVariants({ variant: "outline" }), "w-full h-11 rounded-xl text-xs font-medium")}
            >
              <span>Create New Account</span>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // 5. CURRENT USER IS THE INVITER (CANNOT ACCEPT OWN INVITATION)
  if (initialVerification.isCurrentUserInviter) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-border/80 shadow-redi-card rounded-3xl p-6 sm:p-8 text-center space-y-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertCircle className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Your Invitation
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You sent this invitation. You cannot accept your own invitation.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => router.push("/settings/partner")}
            className="w-full h-11 rounded-xl text-xs font-medium cursor-pointer"
          >
            Manage in Partner Settings
          </Button>
        </Card>
      </div>
    )
  }

  // 6. WRONG INTENDED RECIPIENT
  if (initialVerification.isTargetRecipient === false) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-border/80 shadow-redi-card rounded-3xl p-6 sm:p-8 text-center space-y-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Different Account Required
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This partner invitation was specifically sent to{" "}
              <span className="font-semibold text-foreground">
                @{invitee?.username || "another user"}
              </span>
              .
            </p>
            {currentUsername && (
              <p className="text-xs text-muted-foreground pt-1">
                You are currently signed in as <span className="font-mono text-foreground font-medium">@{currentUsername}</span>.
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="w-full h-11 rounded-xl text-xs font-medium cursor-pointer"
          >
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  // 7. READY TO ACCEPT
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border border-border/80 shadow-redi-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-lavender/60 text-primary border border-lavender-border/80 shadow-xs">
            <HeartHandshake className="size-8 stroke-[2.2]" />
          </div>
          <div className="space-y-1">
            <Badge variant="lavender" className="px-2.5 py-0.5 text-xs font-normal">
              Partner Invitation
            </Badge>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground pt-1">
              Connect with {inviter?.displayName || "Partner"}
            </h1>
            {inviter?.username && (
              <p className="text-xs font-mono text-primary font-medium">
                @{inviter.username}
              </p>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 text-xs text-muted-foreground space-y-2 leading-relaxed">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Shield className="size-3.5 text-primary shrink-0" />
            <span>Secure Partner Connection</span>
          </div>
          <p>
            Accepting will link your accounts in a mutual partner relationship. Opening this invitation does not automatically activate the connection until you explicitly confirm below.
          </p>
        </div>

        {actionError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleDecline}
            className="h-11 rounded-xl text-xs font-medium cursor-pointer border-border/70"
          >
            Decline
          </Button>

          <Button
            type="button"
            disabled={isPending}
            onClick={handleAccept}
            className="h-11 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-xs bg-primary text-primary-foreground"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                <span>Accept Invitation</span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
