"use client"

import * as React from "react"
import { SettingsItem } from "@/components/settings/settings-item"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form"
import { CycleSettingsForm } from "@/components/settings/cycle-settings-form"
import { NotificationPreferencesCard } from "@/components/settings/notification-preferences"
import { PushTestCard } from "@/components/settings/push-test-card"
import { AppearanceSettingsView } from "@/components/settings/appearance-settings-view"
import { PrivacySettingsView } from "@/components/settings/privacy-settings-view"
import { AboutSettingsView } from "@/components/settings/about-settings-view"
import { LogoutButton } from "@/components/auth/logout-button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useTheme } from "@/components/theme/theme-provider"
import { cn } from "@/lib/utils"
import type { ProfileSettingsData } from "@/components/settings/settings-form"
import type { NotificationPreferences } from "@/lib/notifications/types"
import {
  User,
  Camera,
  KeyRound,
  CalendarHeart,
  SlidersHorizontal,
  History,
  HeartHandshake,
  Share2,
  ShieldAlert,
  Bell,
  CalendarDays,
  Heart,
  SunMoon,
  MonitorSmartphone,
  ShieldCheck,
  Lock,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  FileText,
  Shield,
  Clock,
  ChevronRight,
} from "lucide-react"

interface SettingsMenuProps {
  profileData: ProfileSettingsData
  preferences?: NotificationPreferences
}

type CategoryId =
  | "account"
  | "cycle"
  | "partner"
  | "notifications"
  | "appearance"
  | "privacy"
  | "support"

type SubViewId =
  | "profile"
  | "avatar"
  | "cycle"
  | "tracking"
  | "notifications"
  | "appearance"
  | "privacy"
  | "about"

export function SettingsMenu({
  profileData: initialProfileData,
  preferences,
}: SettingsMenuProps) {
  const { theme, mounted } = useTheme()
  const [profileData, setProfileData] = React.useState<ProfileSettingsData>(initialProfileData)
  const [partnerModalOpen, setPartnerModalOpen] = React.useState(false)
  const [expandedCategory, setExpandedCategory] = React.useState<CategoryId | null>(null)
  const [activeView, setActiveView] = React.useState<SubViewId | null>(null)

  // Listen to profile updates dispatched from ProfileSettingsForm
  React.useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ displayName?: string; avatarUrl?: string | null }>
      if (customEvent.detail) {
        setProfileData((prev) => ({
          ...prev,
          ...(customEvent.detail.displayName !== undefined
            ? { displayName: customEvent.detail.displayName }
            : {}),
          ...(customEvent.detail.avatarUrl !== undefined
            ? { avatarUrl: customEvent.detail.avatarUrl }
            : {}),
        }))
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("seijun:profile-updated", handleProfileUpdate)
      return () => window.removeEventListener("seijun:profile-updated", handleProfileUpdate)
    }
  }, [])

  // Sync with browser history and URL query parameters for instant back button support
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const checkUrlView = () => {
      const params = new URLSearchParams(window.location.search)
      const v = params.get("view") as SubViewId | null
      setActiveView(v)
    }

    checkUrlView()

    const onPopState = (e: PopStateEvent) => {
      if (e.state && "view" in e.state) {
        setActiveView(e.state.view)
      } else {
        checkUrlView()
      }
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const navigateToView = (view: SubViewId) => {
    setActiveView(view)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("view", view)
      window.history.pushState({ view }, "", url.toString())
      window.scrollTo({ top: 0, behavior: "instant" })
    }
  }

  const handleBack = () => {
    setActiveView(null)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("view")
      window.history.pushState({ view: null }, "", url.toString())
      window.scrollTo({ top: 0, behavior: "instant" })
    }
  }

  const toggleCategory = (id: CategoryId) => {
    setExpandedCategory((prev) => (prev === id ? null : id))
  }

  // Current theme label
  const themeLabel = React.useMemo(() => {
    if (!mounted) return "System"
    return theme === "system" ? "System" : theme.charAt(0).toUpperCase() + theme.slice(1)
  }, [theme, mounted])

  // Reminder timing summary
  const reminderTimingLabel = React.useMemo(() => {
    if (!preferences) return "3 days before"
    if (preferences.reminder_days_before === 0) return "Day of event"
    if (preferences.reminder_days_before === 1) return "1 day before"
    return "3 days before"
  }, [preferences])

  // Partner notifications status
  const partnerNotifsActive = React.useMemo(() => {
    if (!preferences) return true
    return (
      preferences.partner_daily_notes ||
      preferences.partner_cycle_updates ||
      preferences.partner_activity ||
      preferences.partner_connection
    )
  }, [preferences])

  // ============================================================================
  // INSTANT SUBVIEWS (0ms Transition, No Server Network Delay)
  // ============================================================================
  if (activeView === "profile" || activeView === "avatar") {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <SettingsPageHeader
          badgeText="Account"
          badgeIcon={User}
          title="Profile & Avatar"
          description="Update your display identity, avatar photo, and account classification."
          onBack={handleBack}
        />
        <ProfileSettingsForm initialData={profileData} />
      </div>
    )
  }

  if (activeView === "cycle" || activeView === "tracking") {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <SettingsPageHeader
          badgeText="Cycle & Tracking"
          badgeIcon={CalendarHeart}
          title="Cycle Preferences"
          description="Configure your baseline cycle length and start dates to project your phases accurately."
          onBack={handleBack}
        />
        <CycleSettingsForm initialData={profileData} />
      </div>
    )
  }

  if (activeView === "notifications") {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-in fade-in duration-150">
        <SettingsPageHeader
          badgeText="Notifications"
          badgeIcon={Bell}
          title="Notification Preferences"
          description="Control push notifications, cycle alert timings, and delivery status across your devices."
          onBack={handleBack}
        />
        <NotificationPreferencesCard
          initialPreferences={preferences}
          usageRole={profileData.usageRole}
        />
        <PushTestCard />
      </div>
    )
  }

  if (activeView === "appearance") {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <SettingsPageHeader
          badgeText="Appearance"
          badgeIcon={SunMoon}
          title="Theme & Display"
          description="Choose light, dark, or system mode and tune visual comfort settings."
          onBack={handleBack}
        />
        <AppearanceSettingsView />
      </div>
    )
  }

  if (activeView === "privacy") {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <SettingsPageHeader
          badgeText="Privacy & Security"
          badgeIcon={ShieldCheck}
          title="Privacy & Data Security"
          description="Manage your active session, view database encryption guarantees, and review data policy."
          onBack={handleBack}
        />
        <PrivacySettingsView email={profileData.email} createdAt={profileData.createdAt} />
      </div>
    )
  }

  if (activeView === "about") {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <SettingsPageHeader
          badgeText="Support & About"
          badgeIcon={Sparkles}
          title="About Seijun"
          description="Version info, architecture, common questions, and terms of service."
          onBack={handleBack}
        />
        <AboutSettingsView />
      </div>
    )
  }

  // ============================================================================
  // MAIN SETTINGS MENU (Showing 7 Categories with Hidden Sub-items until clicked)
  // ============================================================================
  const categories: {
    id: CategoryId
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    summaryBadge?: React.ReactNode
    items: React.ReactNode
  }[] = [
    {
      id: "account",
      title: "Account",
      description: "Profile identity, avatar photo, and credentials",
      icon: User,
      summaryBadge: profileData.displayName ? (
        <span className="text-xs text-muted-foreground font-medium truncate max-w-[120px]">
          {profileData.displayName}
        </span>
      ) : undefined,
      items: (
        <>
          <SettingsItem
            id="item-profile"
            title="Profile"
            description="Display name, sex, and role classification"
            value={profileData.displayName || "Set name"}
            icon={User}
            href="/settings/profile"
            onClick={() => navigateToView("profile")}
          />
          <SettingsItem
            id="item-avatar"
            title="Avatar"
            description="Personal profile photo or initials"
            value={profileData.avatarUrl ? "Custom photo" : "Initials"}
            icon={Camera}
            href="/settings/profile"
            onClick={() => navigateToView("avatar")}
          />
          <SettingsItem
            id="item-account-login"
            title="Account & Login"
            description={profileData.email || "Authentication credentials"}
            icon={KeyRound}
            href="/settings/privacy"
            onClick={() => navigateToView("privacy")}
          />
        </>
      ),
    },
    {
      id: "cycle",
      title: "Cycle & Tracking",
      description: "Cycle baseline length, start dates, and past history",
      icon: CalendarHeart,
      summaryBadge: (
        <span className="text-xs text-muted-foreground font-medium">
          {profileData.typicalCycleLength} days
        </span>
      ),
      items: (
        <>
          <SettingsItem
            id="item-cycle-preferences"
            title="Cycle Preferences"
            description="Baseline metrics and calculation rules"
            value={`${profileData.typicalCycleLength} days`}
            icon={CalendarHeart}
            href="/settings/cycle"
            onClick={() => navigateToView("cycle")}
          />
          <SettingsItem
            id="item-tracking-preferences"
            title="Tracking Preferences"
            description="Role mode & journal personalization"
            value={
              profileData.usageRole === "supporter"
                ? "Supporter"
                : profileData.usageRole === "both"
                ? "Dual Mode"
                : "Cycle Tracker"
            }
            icon={SlidersHorizontal}
            href="/settings/cycle"
            onClick={() => navigateToView("tracking")}
          />
          <SettingsItem
            id="item-cycle-history"
            title="Cycle History"
            description="Past intervals, period records & cycle logs"
            icon={History}
            href="/cycles"
          />
        </>
      ),
    },
    {
      id: "partner",
      title: "Partner",
      description: "1:1 connections, sharing options, and permissions",
      icon: HeartHandshake,
      summaryBadge: (
        <Badge variant="lavender" className="text-[10px] px-1.5 py-0 font-normal">
          Phase 20
        </Badge>
      ),
      items: (
        <>
          <SettingsItem
            id="item-partner-connection"
            title="Partner Connection"
            description="1:1 synchronization with partner account"
            icon={HeartHandshake}
            badge={
              <Badge variant="lavender" className="text-[10px] px-1.5 py-0 font-normal">
                Phase 20
              </Badge>
            }
            onClick={() => setPartnerModalOpen(true)}
          />
          <SettingsItem
            id="item-sharing-preferences"
            title="Sharing Preferences"
            description="Choose which cycle phases and symptoms to share"
            icon={Share2}
            badge={
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                Upcoming
              </Badge>
            }
            onClick={() => setPartnerModalOpen(true)}
          />
          <SettingsItem
            id="item-partner-permissions"
            title="Partner Permissions"
            description="Access controls, edit privileges, and revoke access"
            icon={ShieldAlert}
            badge={
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                Upcoming
              </Badge>
            }
            onClick={() => setPartnerModalOpen(true)}
          />
        </>
      ),
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Push notifications, cycle reminders, and partner alerts",
      icon: Bell,
      summaryBadge: (
        <span className="text-xs text-muted-foreground font-medium">
          {reminderTimingLabel}
        </span>
      ),
      items: (
        <>
          <SettingsItem
            id="item-push-notifications"
            title="Push Notifications"
            description="Web push delivery status & browser permissions"
            icon={Bell}
            href="/settings/notifications"
            onClick={() => navigateToView("notifications")}
          />
          <SettingsItem
            id="item-cycle-reminders"
            title="Cycle Reminders"
            description="Period, fertile window, and ovulation alerts"
            value={reminderTimingLabel}
            icon={CalendarDays}
            href="/settings/notifications"
            onClick={() => navigateToView("notifications")}
          />
          <SettingsItem
            id="item-partner-notifications"
            title="Partner Notifications"
            description="Alerts for partner notes and cycle updates"
            value={partnerNotifsActive ? "Enabled" : "Disabled"}
            icon={Heart}
            href="/settings/notifications"
            onClick={() => navigateToView("notifications")}
          />
        </>
      ),
    },
    {
      id: "appearance",
      title: "Appearance",
      description: "Theme mode (light/dark/system) and visual styling",
      icon: SunMoon,
      summaryBadge: (
        <span className="text-xs text-muted-foreground font-medium">
          {themeLabel}
        </span>
      ),
      items: (
        <>
          <SettingsItem
            id="item-theme"
            title="Theme"
            description="Light, dark, or system matching"
            value={themeLabel}
            icon={SunMoon}
            href="/settings/appearance"
            onClick={() => navigateToView("appearance")}
          />
          <SettingsItem
            id="item-display-preferences"
            title="Display Preferences"
            description="OLED dark mode and typography tuning"
            icon={MonitorSmartphone}
            href="/settings/appearance"
            onClick={() => navigateToView("appearance")}
          />
        </>
      ),
    },
    {
      id: "privacy",
      title: "Privacy & Security",
      description: "Data privacy, session security, and account deletion",
      icon: ShieldCheck,
      summaryBadge: (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
          Encrypted
        </Badge>
      ),
      items: (
        <>
          <SettingsItem
            id="item-privacy"
            title="Privacy Guarantees"
            description="Zero ads and strict data confidentiality"
            icon={Lock}
            href="/settings/privacy"
            onClick={() => navigateToView("privacy")}
          />
          <SettingsItem
            id="item-security-sessions"
            title="Security & Sessions"
            description="Current device session and RLS policies"
            icon={ShieldCheck}
            href="/settings/privacy"
            onClick={() => navigateToView("privacy")}
          />
          <SettingsItem
            id="item-danger-zone"
            title="Danger Zone"
            description="Account deletion policy & cryptographic data purge"
            icon={AlertTriangle}
            destructive
            href="/settings/privacy"
            onClick={() => navigateToView("privacy")}
          />
        </>
      ),
    },
    {
      id: "support",
      title: "Support & About",
      description: "Help, FAQs, version info, privacy policy, and terms",
      icon: Sparkles,
      summaryBadge: (
        <Badge variant="lavender" className="text-[10px] px-1.5 py-0 font-normal">
          v2.0.6
        </Badge>
      ),
      items: (
        <>
          <SettingsItem
            id="item-help-faq"
            title="Help / FAQs"
            description="Common questions about cycle projection models"
            icon={HelpCircle}
            href="/settings/about"
            onClick={() => navigateToView("about")}
          />
          <SettingsItem
            id="item-about-seijun"
            title="About Seijun"
            description="Personal cycle companion & architecture"
            value="v2.0.6"
            icon={Sparkles}
            href="/settings/about"
            onClick={() => navigateToView("about")}
          />
          <SettingsItem
            id="item-privacy-policy"
            title="Privacy Policy"
            description="How your reproductive data is protected"
            icon={Shield}
            href="/settings/about"
            onClick={() => navigateToView("about")}
          />
          <SettingsItem
            id="item-terms"
            title="Terms of Service"
            description="Application guidelines and disclaimers"
            icon={FileText}
            href="/settings/about"
            onClick={() => navigateToView("about")}
          />
        </>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      {/* Grouped Category List: Sub-items are hidden until category is clicked */}
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
        {categories.map((category) => {
          const Icon = category.icon
          const isExpanded = expandedCategory === category.id

          return (
            <div key={category.id} className="transition-colors">
              {/* Main Category Header Row */}
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                aria-expanded={isExpanded}
                aria-controls={`sub-items-${category.id}`}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-4 py-3.75 sm:px-4.5 sm:py-4 text-left transition-colors select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                  isExpanded
                    ? "bg-secondary/40 dark:bg-secondary/20"
                    : "hover:bg-secondary/30 active:bg-secondary/50"
                )}
              >
                {/* Leading Icon & Label */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lavender/60 text-primary border border-lavender-border/50">
                    <Icon className="size-5 stroke-[2.2]" />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h2 className="text-sm sm:text-base font-semibold text-foreground tracking-tight truncate">
                      {category.title}
                    </h2>
                    <p className="text-xs text-muted-foreground truncate leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                </div>

                {/* Trailing Controls & Chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  {category.summaryBadge}
                  <ChevronRight
                    className={cn(
                      "size-4.5 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-90 text-primary"
                    )}
                  />
                </div>
              </button>

              {/* Sub-items: HIDDEN unless this category is clicked */}
              {isExpanded && (
                <div
                  id={`sub-items-${category.id}`}
                  className="bg-secondary/15 dark:bg-card/40 border-t border-border/40 divide-y divide-border/30 pl-2 sm:pl-3 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  {category.items}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Standalone Destructive Logout Action at Bottom */}
      <div className="pt-2">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] dark:bg-destructive/[0.06] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">Sign Out</h3>
            <p className="text-xs text-muted-foreground">
              Sign out of your Seijun account on this device.
            </p>
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* Partner Feature Coming Soon Modal */}
      <Dialog open={partnerModalOpen} onOpenChange={setPartnerModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
                <HeartHandshake className="size-5" />
              </div>
              <div>
                <DialogTitle>Partner Connections</DialogTitle>
                <DialogDescription>Scheduled for Seijun Phase 20</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              Partner Connections will enable respectful 1:1 synchronization between accounts. Trackers can selectively share cycle phases and mood symptoms, while supporters receive timely heads-up reminders.
            </p>
            <div className="flex items-center gap-2 text-xs text-foreground bg-secondary/50 p-3 rounded-xl border border-border/50">
              <Clock className="size-4 text-primary shrink-0" />
              <span>Settings and granular sharing permissions will activate in Phase 20.</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
