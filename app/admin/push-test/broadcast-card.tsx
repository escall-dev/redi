"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Radio, AlertTriangle, AlertCircle, Loader2, Send } from "lucide-react"
import { sendGlobalTestPushBroadcastAction } from "@/app/actions/push-test"
import type { PushDeliverySummary } from "@/lib/push/types"

interface AdminPushBroadcastCardProps {
  isDev: boolean
}

export function AdminPushBroadcastCard({ isDev }: AdminPushBroadcastCardProps) {
  const [adminSecret, setAdminSecret] = React.useState("")
  const [isPending, setIsPending] = React.useState(false)
  const [result, setResult] = React.useState<PushDeliverySummary | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleBroadcast = async () => {
    setIsPending(true)
    setErrorMessage(null)
    setResult(null)

    try {
      const res = await sendGlobalTestPushBroadcastAction(adminSecret || undefined)
      setResult(res)
      if (!res.ok && res.error) {
        setErrorMessage(res.error)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unexpected broadcast error.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="border-amber-500/30 bg-card overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Radio className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Global Test Broadcast</CardTitle>
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0 font-normal">
                Test B Only
              </Badge>
            </div>
            <CardDescription>
              Sends standard test notification to all accounts with active subscriptions
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Warning Banner */}
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 p-3.5 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Development / Testing Infrastructure Tool:</strong> This action iterates through all registered push subscriptions in the database and sends an unmistakable test payload. It does NOT contain health or personal data.
          </span>
        </div>

        {/* Secret Input (required if not in dev) */}
        {!isDev && (
          <div className="space-y-1.5">
            <Label htmlFor="adminSecret" className="text-xs font-medium">
              Admin Test Secret
            </Label>
            <Input
              id="adminSecret"
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="Enter ADMIN_TEST_SECRET"
              disabled={isPending}
              className="h-10 text-xs rounded-xl"
            />
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl border bg-destructive/10 border-destructive/30 text-destructive text-xs flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Structured Results Display */}
        {result && (
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-medium text-foreground">
              <span>Broadcast Summary</span>
              <span className={result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                {result.ok ? "BROADCAST COMPLETED" : "BROADCAST FAILED"}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-border/40">
              <div className="p-2 rounded-md bg-card border border-border/40">
                <div className="text-muted-foreground text-[10px]">Attempted</div>
                <div className="font-semibold text-foreground text-sm">{result.attempted}</div>
              </div>
              <div className="p-2 rounded-md bg-card border border-border/40">
                <div className="text-muted-foreground text-[10px]">Delivered</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">{result.delivered}</div>
              </div>
              <div className="p-2 rounded-md bg-card border border-border/40">
                <div className="text-muted-foreground text-[10px]">Expired</div>
                <div className="font-semibold text-amber-600 dark:text-amber-400 text-sm">{result.expired}</div>
              </div>
              <div className="p-2 rounded-md bg-card border border-border/40">
                <div className="text-muted-foreground text-[10px]">Failed</div>
                <div className="font-semibold text-destructive text-sm">{result.failed}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t border-border/50 flex justify-end">
        <Button
          type="button"
          disabled={isPending}
          onClick={handleBroadcast}
          className="gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Broadcasting...
            </>
          ) : (
            <>
              <Send className="size-3.5" />
              Broadcast Test Notification to All Accounts
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
