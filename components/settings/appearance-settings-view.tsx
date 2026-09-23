"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { SunMoon, Sparkles, MonitorSmartphone } from "lucide-react"

export function AppearanceSettingsView() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Theme Card */}
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <SunMoon className="size-5" />
            </div>
            <div>
              <CardTitle>Theme Mode</CardTitle>
              <CardDescription>
                Personalize how Seijun looks on this device
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      {/* Display & Visuals Info Card */}
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <MonitorSmartphone className="size-5" />
            </div>
            <div>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>
                Interface scaling and visual comfort settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-secondary/50 p-4 border border-border/50 text-sm">
            <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Adaptive Color Palette</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Seijun automatically harmonizes its soft lavender and amethyst palettes with your device&apos;s ambient lighting and active system appearance.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-secondary/50 p-4 border border-border/50 text-sm">
            <SunMoon className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">OLED Dark Mode</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When dark mode is active, deep zinc contrast levels reduce battery consumption and provide ocular relief during nighttime cycle logging.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
