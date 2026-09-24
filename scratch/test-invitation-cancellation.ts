import fs from "fs"
import path from "path"
import assert from "assert"

const rootDir = process.cwd()

console.log("=== Testing Partner Invitation Cancellation & Success Dialog ===")

// 1. Verify InvitationCancelledDialog
const cancelledDialogPath = path.join(rootDir, "components", "partner", "invitation-cancelled-dialog.tsx")
assert(fs.existsSync(cancelledDialogPath), "invitation-cancelled-dialog.tsx exists")
const cancelledDialogContent = fs.readFileSync(cancelledDialogPath, "utf-8")
assert(cancelledDialogContent.includes("Invitation Cancelled"), "Dialog has 'Invitation Cancelled' title")
assert(cancelledDialogContent.includes("partnerUsername"), "Dialog accepts partnerUsername prop")
assert(cancelledDialogContent.includes("Done"), "Dialog has Done button")
console.log("  ✓ InvitationCancelledDialog component verified")

// 2. Verify AddPartnerModal fixes and cancellation
const addModalPath = path.join(rootDir, "components", "partner", "add-partner-modal.tsx")
const addModalContent = fs.readFileSync(addModalPath, "utf-8")

// Layout fix: overflow-hidden, min-w-0, clean pending acceptance label
assert(addModalContent.includes("overflow-hidden"), "AddPartnerModal has overflow-hidden on DialogContent")
assert(addModalContent.includes("min-w-0"), "AddPartnerModal uses min-w-0 to prevent flex/grid blowout")
assert(addModalContent.includes("Invitation sent to") && addModalContent.includes("pending acceptance"), "AddPartnerModal displays clean pending acceptance message")
console.log("  ✓ AddPartnerModal layout & clean pending acceptance verified")

// Cancellation features
assert(addModalContent.includes("cancelPartnerInvitationAction"), "AddPartnerModal imports cancelPartnerInvitationAction")
assert(addModalContent.includes("Cancel Invitation"), "AddPartnerModal provides Cancel Invitation button")
assert(addModalContent.includes("Cancel Invitation?"), "AddPartnerModal provides confirmation dialog")
assert(addModalContent.includes("InvitationCancelledDialog"), "AddPartnerModal embeds InvitationCancelledDialog")
console.log("  ✓ AddPartnerModal cancellation flow & success modal verified")

// 3. Verify PartnerConnectionCard
const cardPath = path.join(rootDir, "components", "partner", "partner-connection-card.tsx")
const cardContent = fs.readFileSync(cardPath, "utf-8")
assert(!cardContent.includes("confirm(\"Are you sure you want to cancel"), "Browser confirm() removed from PartnerConnectionCard")
assert(cardContent.includes("InvitationCancelledDialog"), "PartnerConnectionCard embeds InvitationCancelledDialog")
assert(cardContent.includes("Cancel Invitation?"), "PartnerConnectionCard provides confirmation dialog")
console.log("  ✓ PartnerConnectionCard cancellation dialog & success modal verified")

console.log("\n=================================================")
console.log("ALL INVITATION CANCELLATION CHECKS PASSED! 🎉")
console.log("=================================================")
