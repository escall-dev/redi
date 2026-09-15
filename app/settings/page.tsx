import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogoutButton } from "@/components/auth/logout-button"
import { createClient } from "@/lib/supabase/server"
import { Settings, Shield, User, Lock } from "lucide-react"

export default async function SettingsPage() {
  let userEmail: string | null = null
  let displayName: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userEmail = user.email || null
      displayName = user.user_metadata?.display_name || null

      // Fetch profile if available
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single()

      if (profile?.display_name) {
        displayName = profile.display_name
      }
    }
  } catch {
    // If not configured or error, fall back gracefully
  }

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
          Manage your account, preferences, and data privacy.
        </p>
      </div>

      {/* Account Profile Card */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <User className="size-5" />
            </div>
            <div>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>
                Your authenticated profile in Redi
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-secondary/50 border border-border/50 text-sm">
            <span className="text-muted-foreground">Display Name</span>
            <span className="font-medium text-foreground">{displayName || "Not set"}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-secondary/50 border border-border/50 text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-foreground">{userEmail || "Not available"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Security & Sign Out Card */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <Lock className="size-5" />
            </div>
            <div>
              <CardTitle>Session & Security</CardTitle>
              <CardDescription>
                Sign out or manage your active session
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Signing out will invalidate your session on this device and return you to the sign-in screen.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end pt-2 border-t border-border/50">
          <LogoutButton />
        </CardFooter>
      </Card>

      {/* Future Settings Placeholder */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <Settings className="size-5" />
            </div>
            <div>
              <CardTitle>App Preferences</CardTitle>
              <CardDescription>
                Cycle reminders, theme, and export options
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-secondary/60 p-4 border border-border/50 text-sm text-foreground/80 leading-relaxed">
            Notification and preference toggles will appear here in upcoming phases.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
