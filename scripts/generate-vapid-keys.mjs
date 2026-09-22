import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

/**
 * Generates RFC 8292 NIST P-256 (prime256v1) VAPID key pair for Web Push.
 *
 * Public key: 65 bytes uncompressed elliptic curve point (0x04 + X + Y) -> 87 chars base64url.
 * Private key: 32 bytes scalar -> 43 chars base64url.
 */
export function generateVapidKeys() {
  const curve = crypto.createECDH("prime256v1")
  curve.generateKeys()

  const publicKey = curve.getPublicKey("base64url")
  const privateKey = curve.getPrivateKey("base64url")

  return {
    publicKey,
    privateKey,
  }
}

const projectRoot = process.cwd()
const envLocalPath = path.join(projectRoot, ".env.local")

// If invoked as a CLI script
if (process.argv[1] && process.argv[1].endsWith("generate-vapid-keys.mjs")) {
  const { publicKey, privateKey } = generateVapidKeys()

  if (fs.existsSync(envLocalPath)) {
    const existing = fs.readFileSync(envLocalPath, "utf8")
    if (existing.includes("VAPID_PRIVATE_KEY") || existing.includes("NEXT_PUBLIC_VAPID_PUBLIC_KEY")) {
      console.log("[vapid] VAPID keys already exist in .env.local. No changes made.")
      process.exit(0)
    }

    const appendData = `\n# Web Push VAPID Configuration (Phase 17)\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\nVAPID_SUBJECT=mailto:admin@seijun.app\n`
    fs.appendFileSync(envLocalPath, appendData, "utf8")
    console.log("[vapid] Successfully generated and appended VAPID keys to .env.local.")
  } else {
    const newEnvData = `# Web Push VAPID Configuration (Phase 17)\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\nVAPID_SUBJECT=mailto:admin@seijun.app\n`
    fs.writeFileSync(envLocalPath, newEnvData, "utf8")
    console.log("[vapid] Successfully created .env.local with VAPID keys.")
  }
}
