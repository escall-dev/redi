"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  CalendarHeart,
  Sparkles,
  Clock,
  CheckCheck,
  Check,
  Trash2,
  Loader2,
  Sliders,
  ExternalLink,
  Inbox,
  UserPlus,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  deleteNotificationAction,
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

const TYPE_LABELS: Record<string, string> = {
  period_upcoming: "Upcoming Period",
  period_expected: "Expected Period",
  fertile_window: "Fertile Window",
  ovulation: "Ovulation Day",
  cycle_transition: "Cycle Transition",
  missed_period: "Late Period Check-in",
  partner_invitation: "Partner Request",
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return isoStr
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const [filter, setFilter] = React.useState<"all" | "unread">("all")
  const [loading, setLoading] = React.useState(true)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [notifications, setNotifications] = React.useState<NotificationEventRow[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)

  const loadNotifications = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await getUserNotificationsAction({ limit: 100 })
      if (res.ok) {
        setNotifications(res.notifications)
        setUnreadCount(res.unreadCount)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const filteredItems = React.useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.read_at)
    }
    return notifications
  }, [notifications, filter])

  const handleItemClick = async (item: NotificationEventRow) => {
    if (!item.read_at) {
      setUnreadCount((c) => Math.max(0, c - 1))
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
      )
      void markNotificationAsReadAction(item.id)
    }

    if (item.url) {
      router.push(item.url)
    }
  }

  const handleMarkAsRead = async (e: React.MouseEvent, item: NotificationEventRow) => {
    e.stopPropagation()
    setBusyId(item.id)
    setUnreadCount((c) => Math.max(0, c - 1))
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
    )
    try {
      await markNotificationAsReadAction(item.id)
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setBusyId(id)
    const target = notifications.find((n) => n.id === id)
    if (target && !target.read_at) {
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await deleteNotificationAction(id)
    } finally {
      setBusyId(null)
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
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="lavender" className="gap-1.5 font-normal text-xs px-2.5 py-0.5">
              <Bell className="size-3 text-primary" />
              Notifications
            </Badge>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Notification Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Review past cycle alerts, predictions, and personal reminders.
          </p>
        </div>

        {/* Quick Settings Link */}
        <Link
          href="/settings#notification-preferences"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-border/60 bg-secondary/60 hover:bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-all shadow-xs"
        >
          <Sliders className="size-3.5 text-muted-foreground" />
          <span>Notification Settings</span>
        </Link>
      </div>

      {/* Main Card with Filter Tabs & List */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 rounded-lg bg-secondary/80 p-1 border border-border/50 self-start">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  filter === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  filter === "unread"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Mark all as read action */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline self-end sm:self-auto disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-border/50">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Loading notifications...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary/80 text-muted-foreground mb-3">
                <Inbox className="size-6 stroke-[1.8]" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                {filter === "unread"
                  ? "You have caught up with all your cycle reminders."
                  : "Upcoming cycle reminders will appear here when scheduled."}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const Icon = TYPE_ICONS[item.type] || Bell
              const typeLabel = TYPE_LABELS[item.type] || "Cycle Reminder"
              const isUnread = !item.read_at

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group flex items-start justify-between gap-3 p-4 transition-colors cursor-pointer select-none hover:bg-secondary/40 ${
                    isUnread ? "bg-primary/[0.02]" : ""
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${
                        isUnread
                          ? "bg-primary/10 text-primary border-primary/20 shadow-xs"
                          : "bg-secondary text-muted-foreground border-border/60"
                      }`}
                    >
                      <Icon className="size-4.5" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground">
                          {item.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-normal border-border/60 text-muted-foreground"
                        >
                          {typeLabel}
                        </Badge>
                        {isUnread && (
                          <span className="size-1.5 rounded-full bg-primary" />
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.body}
                      </p>

                      <div className="flex items-center gap-2 pt-0.5 text-[11px] text-muted-foreground/80">
                        <span>{formatDate(item.created_at)}</span>
                        {item.url && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-0.5 text-primary group-hover:underline">
                              <span>Open</span>
                              <ExternalLink className="size-2.5" />
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 self-center">
                    {isUnread && (
                      <button
                        type="button"
                        aria-label="Mark as read"
                        title="Mark as read"
                        onClick={(e) => handleMarkAsRead(e, item)}
                        disabled={busyId === item.id}
                        className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Check className="size-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      aria-label="Delete notification"
                      title="Delete notification"
                      onClick={(e) => handleDelete(e, item.id)}
                      disabled={busyId === item.id}
                      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
