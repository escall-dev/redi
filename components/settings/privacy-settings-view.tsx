"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogoutButton } from "@/components/auth/logout-button"
import {
  ShieldCheck,
  Lock,
  Mail,
  Calendar,
  AlertTriangle,
  KeyRound,
  EyeOff,
  Server,
} from "lucide-react"

interface PrivacySettingsViewProps {
  email: string
  createdAt: string
}

function formatDateDisplay(isoString: string): string {
  if (!isoString) return "N/A"
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d)
  } catch {
    return isoString
  }
}

export function PrivacySettingsView({ email, createdAt }: PrivacySettingsViewProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Account & Session Security */}
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <CardTitle>Account & Session Security</CardTitle>
              <CardDescription>
                Signed-in credentials and current device authentication
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3.5 rounded-xl bg-secondary/50 border border-border/50 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              <span>Registered Email</span>
            </div>
            <span className="font-medium text-foreground">{email || "Not available"}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3.5 rounded-xl bg-secondary/50 border border-border/50 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4 shrink-0" />
              <span>Account Created</span>
            </div>
            <span className="font-medium text-foreground">{formatDateDisplay(createdAt)}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3.5 rounded-xl bg-secondary/50 border border-border/50 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Server className="size-4 shrink-0" />
              <span>Database Access Control</span>
            </div>
            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-normal">
              Row-Level Security (RLS) Active
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Sign out of Seijun on this device.
          </p>
          <LogoutButton />
        </CardFooter>
      </Card>

      {/* Privacy Guarantees Card */}
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <Lock className="size-5" />
            </div>
            <div>
              <CardTitle>Data Privacy Principles</CardTitle>
              <CardDescription>
                How Seijun protects your menstrual health and journal logs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3 rounded-xl bg-secondary/40 p-3.5 border border-border/40">
            <EyeOff className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">Zero Third-Party Advertising</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your cycle symptoms, mood notes, and intimate dates are never sold, rented, or shared with advertisers or data brokers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-secondary/40 p-3.5 border border-border/40">
            <KeyRound className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">Cryptographic Isolation</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All Supabase database queries enforce cryptographic Row-Level Security scoped directly to your unique authenticated user ID.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/[0.02] overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px] px-1.5 py-0 font-normal">
                  Data Policy
                </Badge>
              </div>
              <CardDescription>
                Permanent account deletion and authentication management
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-destructive/20 bg-card p-4 space-y-2 text-sm">
            <p className="font-medium text-foreground">
              Account Deletion & Data Purge
            </p>
            <p className="text-muted-foreground leading-relaxed text-xs">
              To protect your privacy and ensure cryptographic guarantees, complete account deletion permanently purges all authentication credentials, cycle history, symptoms, and daily logs. In compliance with security standards, client apps cannot hold administrative database privileges. If you wish to delete your account completely, please submit a deletion request to support or contact your administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
