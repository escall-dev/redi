"use client"

import * as React from "react"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { PartnerConnectionCard } from "@/components/partner/partner-connection-card"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { HeartHandshake, ShieldCheck, Lock, Users } from "lucide-react"

interface PartnerSettingsViewProps {
  onBack?: () => void
}

export function PartnerSettingsView({ onBack }: PartnerSettingsViewProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-in fade-in duration-150">
      <SettingsPageHeader
        badgeText="Partner"
        badgeIcon={HeartHandshake}
        title="Partner Connection"
        description="Connect with your partner for respectful synchronization and cycle awareness."
        onBack={onBack}
      />

      {/* Main Connection State Card */}
      <PartnerConnectionCard />

      {/* Architecture & Guarantees Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
        <Card className="border-border/60 bg-secondary/20 shadow-none">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary shrink-0" />
              <CardTitle className="text-xs font-semibold">Partner Model</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CardDescription className="text-[11px] leading-relaxed">
              Each account can connect with exactly one partner at a time. No group sharing or public directory.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-secondary/20 shadow-none">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-primary shrink-0" />
              <CardTitle className="text-xs font-semibold">Privacy First</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CardDescription className="text-[11px] leading-relaxed">
              Connecting establishes mutual consent. All cycle and symptom categories remain private by default until explicitly enabled.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
