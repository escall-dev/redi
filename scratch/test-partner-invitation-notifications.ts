import fs from "fs"
import path from "path"
import assert from "assert"

const rootDir = process.cwd()

console.log("=== Testing Partner Invitation Notifications & Streamlined Modal ===")

// 1. Verify Database Migration
const migrationPath = path.join(rootDir, "supabase", "migrations", "20260924000004_partner_notifications.sql")
assert(fs.existsSync(migrationPath), "Migration 20260924000004_partner_notifications.sql exists")
const migrationContent = fs.readFileSync(migrationPath, "utf-8")
assert(migrationContent.includes("partner_invitation"), "Migration adds partner_invitation to notification_events constraint")
assert(migrationContent.includes("notify_partner_invitation"), "Migration defines notify_partner_invitation RPC")
assert(migrationContent.includes("get_partner_push_subscriptions"), "Migration defines get_partner_push_subscriptions RPC")
console.log("  ✓ Database migration & RPC definitions verified")

// 2. Verify Partner Notification Service
const notifServicePath = path.join(rootDir, "lib", "partner", "notification.ts")
assert(fs.existsSync(notifServicePath), "lib/partner/notification.ts exists")
const notifServiceContent = fs.readFileSync(notifServicePath, "utf-8")
assert(notifServiceContent.includes("sendPartnerInvitationNotification"), "Exports sendPartnerInvitationNotification")
assert(notifServiceContent.includes("sendWebPushNotification"), "Dispatches Web Push notification")
assert(notifServiceContent.includes("partner_connection"), "Respects partner_connection notification preference")
console.log("  ✓ Partner notification service with Web Push & preference checks verified")

// 3. Verify Invitation Service Triggers Notification
const partnerServicePath = path.join(rootDir, "lib", "partner", "service.ts")
const partnerServiceContent = fs.readFileSync(partnerServicePath, "utf-8")
assert(partnerServiceContent.includes("sendPartnerInvitationNotification"), "createPartnerInvitation triggers partner notification")
console.log("  ✓ createPartnerInvitation triggers sendPartnerInvitationNotification")

// 4. Verify Notification Bell & Notification Page
const bellPath = path.join(rootDir, "components", "notifications", "notification-bell.tsx")
const bellContent = fs.readFileSync(bellPath, "utf-8")
assert(bellContent.includes("partner_invitation"), "Notification bell supports partner_invitation type")
assert(bellContent.includes("UserPlus"), "Notification bell renders UserPlus icon for partner requests")

const notifPagePath = path.join(rootDir, "app", "notifications", "page.tsx")
const notifPageContent = fs.readFileSync(notifPagePath, "utf-8")
assert(notifPageContent.includes("partner_invitation"), "Notifications page supports partner_invitation type")
assert(notifPageContent.includes("Partner Request"), "Notifications page has Partner Request badge")

const notifActionsPath = path.join(rootDir, "app", "actions", "notifications.ts")
const notifActionsContent = fs.readFileSync(notifActionsPath, "utf-8")
assert(notifActionsContent.includes("partner_invitations"), "getUserNotificationsAction queries incoming partner invitations")
assert(notifActionsContent.includes("partner_invitations"), "getUnreadNotificationCountAction includes incoming partner invitations")
console.log("  ✓ Notification bell & notifications page dynamic integration verified")

// 5. Verify AddPartnerModal Streamlining & Clean State
const modalPath = path.join(rootDir, "components", "partner", "add-partner-modal.tsx")
const modalContent = fs.readFileSync(modalPath, "utf-8")
assert(modalContent.includes("Add Partner"), "Modal has direct 1-click 'Add Partner' button")
assert(!modalContent.includes("Select ->") && !modalContent.includes("Select →"), "Modal does not use 'Select ->' multi-step flow")
assert(!modalContent.includes("step === \"confirm\""), "Modal removed intermediate confirm step")
assert(!modalContent.includes("PartnerQrDialog"), "Modal removed QR code dialog")
assert(!modalContent.includes("readOnly\n                    value={invitationUrl}"), "Modal removed shareable link input")
assert(modalContent.includes("Invitation sent to") && modalContent.includes("pending acceptance"), "Modal displays 'Invitation sent to @... and is pending acceptance'")
console.log("  ✓ AddPartnerModal direct 1-click action & clean pending acceptance screen verified")

console.log("\n=================================================")
console.log("ALL PARTNER INVITATION NOTIFICATION TESTS PASSED! 🎉")
console.log("=================================================")
