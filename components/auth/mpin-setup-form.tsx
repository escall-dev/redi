"use client"

import * as React from "react"
import { RediLogo } from "@/components/brand/redi-logo"
import { MpinInput } from "@/components/auth/mpin-input"
import { saveMpin } from "@/lib/auth/mpin-storage"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { KeyRound, Shield, AlertCircle, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"

export interface MpinSetupFormProps {
  userId: string
  userEmail?: string
  displayName?: string | null
  onSuccess: () => void
  onCancel?: () => void
}

export function MpinSetupForm({
  userId,
  userEmail,
  displayName,
  onSuccess,
  onCancel,
}: MpinSetupFormProps) {
  const [step, setStep] = React.useState<"create" | "confirm">("create")
  const [mpin, setMpin] = React.useState("")
  const [confirmMpin, setConfirmMpin] = React.useState("")
  const [rememberDevice, setRememberDevice] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleCreateComplete = (val: string) => {
    if (val.length === 6) {
      setError(null)
      setStep("confirm")
    }
  }

  const handleConfirmComplete = async (val: string) => {
    if (val.length !== 6) return

    if (val !== mpin) {
      setError("MPINs do not match. Please try again.")
      setConfirmMpin("")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await saveMpin(userId, val, rememberDevice, { email: userEmail, displayName })
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save MPIN. Please try again.")
      setIsSaving(false)
    }
  }

  const handleBackToCreate = () => {
    setStep("create")
    setConfirmMpin("")
    setError(null)
  }

  return (
    <div className="w-full space-y-6 max-w-md mx-auto">
      <Card className="border border-lavender-border/80 bg-card shadow-redi-card rounded-3xl transition-all">
        <CardContent className="pt-8 pb-8 px-5 sm:px-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative flex items-center justify-center p-3 rounded-2xl bg-lavender/60 border border-lavender-border/80 shadow-xs">
              <KeyRound className="size-6 text-primary" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {step === "create" ? "Create your 6-digit MPIN" : "Confirm your 6-digit MPIN"}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step === "create"
                  ? "Set an MPIN for fast and secure access on this device."
                  : "Re-enter your 6 digits to verify."}
              </p>
            </div>
          </div>

          {/* Feedback Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Step 1: Create */}
          {step === "create" && (
            <div className="space-y-5">
              <MpinInput
                value={mpin}
                onChange={(val) => {
                  setMpin(val)
                  setError(null)
                }}
                onComplete={handleCreateComplete}
                label="Choose 6 digits"
                showClear={true}
                error={Boolean(error)}
                autoFocus={true}
              />

              <div className="flex items-center justify-between pt-1">
                <label
                  htmlFor="rememberDeviceSetup"
                  className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <input
                    id="rememberDeviceSetup"
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                  />
                  <span>Remember this device</span>
                </label>
              </div>

              <Button
                type="button"
                disabled={mpin.length !== 6}
                onClick={() => handleCreateComplete(mpin)}
                className="w-full h-11 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-redi-sm transition-all cursor-pointer"
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === "confirm" && (
            <div className="space-y-5">
              <MpinInput
                value={confirmMpin}
                onChange={(val) => {
                  setConfirmMpin(val)
                  setError(null)
                }}
                onComplete={handleConfirmComplete}
                label="Confirm 6 digits"
                showClear={true}
                error={Boolean(error)}
                autoFocus={true}
                disabled={isSaving}
              />

              <div className="flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToCreate}
                  disabled={isSaving}
                  className="h-11 px-4 rounded-xl border-border/80 cursor-pointer"
                >
                  <ArrowLeft className="size-4 mr-1" />
                  Back
                </Button>

                <Button
                  type="button"
                  disabled={confirmMpin.length !== 6 || isSaving}
                  onClick={() => handleConfirmComplete(confirmMpin)}
                  className="flex-1 h-11 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-redi-sm transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Saving MPIN...
                    </>
                  ) : (
                    "Confirm & Finish"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
          <Shield className="size-3.5 text-primary" />
          <span>Stored as a cryptographic verifier; never in plaintext</span>
        </div>
      </div>
    </div>
  )
}
