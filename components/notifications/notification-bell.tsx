"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  CalendarHeart,
  Sparkles,
  CheckCheck,
  ArrowRight,
  Loader2,
  Clock,
  ExternalLink,
  UserPlus,
} from "lucide-react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  type NotificationEventRow,
} from "@/app/actions/notifications"

const TYPE_ICONS: Record<string, React.ElementType> = {
  period_upcoming: CalendarHeart,
  period_expected: CalendarHeart,
  fertile_window: Sparkles,
  ovulation: Sparkles,
  cycle_transition: Clock,
  missed_period: CalendarHeart,
  partner_invitation: UserPlus,
}

function formatNotificationTime(isoStr: string): string {
  try {
    const date = new Date(isoStr)
    const now = new Date()
    const diffHours = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.round(diffHours / 24)
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationEventRow[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)

  // Fetch recent notifications when popover opens or mounts
  const refreshNotifications = React.useCallback(async () => {
    try {
      const res = await getUserNotificationsAction({ limit: 5 })
      if (res.ok) {
        setNotifications(res.notifications)
        setUnreadCount(res.unreadCount)
      }
    } catch {
      // Ignore background fetch failure
    }
  }, [])

  React.useEffect(() => {
    void refreshNotifications()
  }, [refreshNotifications])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      void refreshNotifications()
    }
  }

  const handleItemClick = async (item: NotificationEventRow) => {
    if (!item.read_at) {
      // Optimistically decrement count
      setUnreadCount((c) => Math.max(0, c - 1))
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
      )
      void markNotificationAsReadAction(item.id)
    }

    setOpen(false)
    if (item.url) {
      router.push(item.url)
    }
  }

  const handleMarkAllRead = async () => {
    setLoading(true)
    setUnreadCount(0)
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    )
    try {
      await markAllNotificationsAsReadAction()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label="Notifications"
        className={`relative size-9 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/50 flex items-center justify-center text-primary transition-all active:scale-95 shadow-xs focus:outline-none ${className ?? ""}`}
      >
        <Bell className="size-4.5 stroke-[2.2]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        className="w-80 sm:w-88 p-0 overflow-hidden shadow-lg border-border/80"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-medium bg-primary/10 text-primary">
                {unreadCount} new
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={loading}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CheckCheck className="size-3" />
              )}
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notification items list */}
        <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary/80 text-muted-foreground mb-2">
                <Bell className="size-5 stroke-[1.8]" />
              </div>
              <p className="text-xs font-medium text-foreground">All caught up!</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                No cycle alerts or reminders right now.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const Icon = TYPE_ICONS[item.type] || Bell
              const isUnread = !item.read_at

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group flex items-start gap-2.5 p-3 text-left transition-colors cursor-pointer select-none hover:bg-secondary/50 ${
                    isUnread ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <div
                    className={`flex size-7.5 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${
                      isUnread
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-secondary text-muted-foreground border-border/60"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </div>

                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatNotificationTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  {isUnread && (
                    <span className="size-1.5 rounded-full bg-primary shrink-0 self-center" />
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 bg-muted/20 p-2 text-center">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-primary hover:underline"
          >
            <span>View all in Notification Center</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
