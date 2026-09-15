import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, Shield } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="lavender" className="gap-1 font-normal text-xs">
            <Shield className="size-3" />
            Preferences
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Manage your app preferences and data privacy.
        </p>
      </div>

      {/* Placeholder Surface Card */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <Settings className="size-5" />
            </div>
            <div>
              <CardTitle>App Settings</CardTitle>
              <CardDescription>
                Placeholder Route
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-secondary/60 p-4 border border-border/50 text-sm text-foreground/80 leading-relaxed">
            Your Redi settings and privacy controls will appear here.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
