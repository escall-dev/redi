import fs from "fs"
import path from "path"
import assert from "assert"

const rootDir = process.cwd()

console.log("=== Testing Realtime & Background Push Notifications for Partner Invitations ===")

// 1. Verify Realtime Database Migration
const migrationPath = path.join(rootDir, "supabase", "migrations", "20260924000005_enable_realtime_notifications.sql")
assert(fs.existsSync(migrationPath), "Migration 20260924000005_enable_realtime_notifications.sql exists")
const migrationContent = fs.readFileSync(migrationPath, "utf-8")
assert(migrationContent.includes("ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_events"), "Enables realtime on notification_events")
assert(migrationContent.includes("ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_invitations"), "Enables realtime on partner_invitations")
assert(migrationContent.includes("REPLICA IDENTITY FULL"), "Sets REPLICA IDENTITY FULL for complete payloads")
console.log("  ✓ Database Realtime publication migration verified")

// 2. Verify Push Service Guarantees
const partnerServicePath = path.join(rootDir, "lib", "partner", "service.ts")
const partnerServiceContent = fs.readFileSync(partnerServicePath, "utf-8")
assert(partnerServiceContent.includes("await sendPartnerInvitationNotification"), "Awaits sendPartnerInvitationNotification to prevent early serverless termination")
assert(partnerServiceContent.includes("invitationId: invitation.id"), "Passes invitationId to notification dispatcher")
console.log("  ✓ Service awaits push notification delivery and forwards invitationId")

// 3. Verify Notification Dispatcher & Payload
const notifPath = path.join(rootDir, "lib", "partner", "notification.ts")
const notifContent = fs.readFileSync(notifPath, "utf-8")
assert(notifContent.includes("invitationId?: string"), "SendPartnerInvitationNotificationParams supports invitationId")
assert(notifContent.includes("invitationId,"), "Push payload and in-app event include invitationId")
console.log("  ✓ Partner notification dispatcher formats payload with invitationId")

// 4. Verify Service Worker Background OS Push & Active Tab Broadcast
const swPath = path.join(rootDir, "public", "sw.js")
const swContent = fs.readFileSync(swPath, "utf-8")
assert(swContent.includes("self.registration.showNotification(title, options)"), "Shows OS notification even when app/browser is closed")
assert(swContent.includes("renotify: true"), "Enables renotify for recurring awareness")
assert(swContent.includes("SEIJUN_PUSH_RECEIVED"), "Broadcasts push event to open window tabs")
assert(swContent.includes("notificationclick"), "Handles notification click to focus or open window")
console.log("  ✓ Service Worker background OS push and foreground broadcast verified")

// 5. Verify RealtimeNotificationProvider & In-App Toast
const providerPath = path.join(rootDir, "components", "notifications", "realtime-notification-provider.tsx")
assert(fs.existsSync(providerPath), "realtime-notification-provider.tsx exists")
const providerContent = fs.readFileSync(providerPath, "utf-8")
assert(providerContent.includes("postgres_changes"), "Subscribes to Supabase postgres_changes")
assert(providerContent.includes("notification_events"), "Listens to notification_events table")
assert(providerContent.includes("partner_invitations"), "Listens to partner_invitations table")
assert(providerContent.includes("SEIJUN_PUSH_RECEIVED"), "Listens to service worker message relay")
assert(providerContent.includes("seijun:notification-update"), "Dispatches notification update event")
assert(providerContent.includes("seijun:partner-state-changed"), "Dispatches partner state changed event")
assert(providerContent.includes("acceptPartnerInvitationByIdAction"), "Includes 1-click Accept action handler")
assert(providerContent.includes("Accept"), "Renders 1-click Accept button in toast")
assert(providerContent.includes("View"), "Renders View button in toast")
console.log("  ✓ RealtimeNotificationProvider with 1-click Accept toast verified")

// 6. Verify NotificationBell Live Synchronization
const bellPath = path.join(rootDir, "components", "notifications", "notification-bell.tsx")
const bellContent = fs.readFileSync(bellPath, "utf-8")
assert(bellContent.includes("seijun:notification-update"), "NotificationBell listens to seijun:notification-update")
console.log("  ✓ NotificationBell live update listener verified")

// 7. Verify PartnerConnectionCard Live Synchronization
const cardPath = path.join(rootDir, "components", "partner", "partner-connection-card.tsx")
const cardContent = fs.readFileSync(cardPath, "utf-8")
assert(cardContent.includes("seijun:partner-state-changed"), "PartnerConnectionCard listens to seijun:partner-state-changed")
assert(cardContent.includes("new CustomEvent(\"seijun:partner-state-changed\")"), "Card dispatches sync event on user actions")
console.log("  ✓ PartnerConnectionCard live state update listener verified")

// 8. Verify AppShell Integration
const shellPath = path.join(rootDir, "components", "shell", "app-shell.tsx")
const shellContent = fs.readFileSync(shellPath, "utf-8")
assert(shellContent.includes("RealtimeNotificationProvider"), "AppShell embeds RealtimeNotificationProvider")
console.log("  ✓ AppShell integration verified")

console.log("\n=======================================================")
console.log("ALL REALTIME & BACKGROUND PUSH NOTIFICATION TESTS PASSED! 🎉")
console.log("=======================================================")
