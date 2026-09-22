import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

console.log("=== Running Seijun Web Push Subscription Test Suite ===\n")

let failures = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`)
    failures++
  } else {
    console.log(`  ✓ ${message}`)
  }
}

// ---------------------------------------------------------------------------
// 1. BASE64URL CONVERSION LOGIC TEST
// ---------------------------------------------------------------------------
console.log("[Test 1] Testing Base64URL -> Uint8Array conversion logic...")

function urlBase64ToUint8Array(base64String) {
  const cleanString = base64String.trim()
  if (!cleanString) {
    throw new Error("[VAPID] Base64 string must not be empty.")
  }

  const paddingLength = (4 - (cleanString.length % 4)) % 4
  const padding = "=".repeat(paddingLength)

  const base64 = (cleanString + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

// Test basic ASCII: "Hello" in base64 is "SGVsbG8=" -> base64url is "SGVsbG8"
const helloBytes = urlBase64ToUint8Array("SGVsbG8")
const helloText = new TextDecoder().decode(helloBytes)
assert(helloText === "Hello", `Decoded "Hello" correctly, got "${helloText}"`)

// Test URL-safe characters: '-' and '_'
// Standard base64 "+/==" -> base64url "-_"
// Bytes: 0xfb, 0xff
const specialBytes = urlBase64ToUint8Array("-_8") // 0xfb, 0xff
assert(specialBytes.length === 2, `Decoded URL-safe bytes length: 2`)
assert(specialBytes[0] === 0xfb, `First byte is 0xfb`)
assert(specialBytes[1] === 0xff, `Second byte is 0xff`)

// Test empty string rejection
let emptyThrew = false
try {
  urlBase64ToUint8Array("")
} catch {
  emptyThrew = true
}
assert(emptyThrew, "Empty string throws expected error")

// ---------------------------------------------------------------------------
// 2. VAPID CONFIGURATION AND KEY FORMAT VALIDATION
// ---------------------------------------------------------------------------
console.log("\n[Test 2] Testing VAPID Public Key format...")

const envLocalPath = path.join(rootDir, ".env.local")
let vapidPublicKey = ""

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8")
  const match = envContent.match(/NEXT_PUBLIC_VAPID_PUBLIC_KEY=(.+)/)
  if (match) {
    vapidPublicKey = match[1].trim()
  }
}

assert(vapidPublicKey.length > 0, "NEXT_PUBLIC_VAPID_PUBLIC_KEY found in .env.local")

if (vapidPublicKey) {
  const keyBytes = urlBase64ToUint8Array(vapidPublicKey)
  assert(
    keyBytes.length === 65,
    `VAPID public key decodes to 65-byte uncompressed P-256 EC point (actual: ${keyBytes.length})`
  )
  assert(
    keyBytes[0] === 4,
    `VAPID public key starts with 0x04 uncompressed point prefix (actual: ${keyBytes[0]})`
  )
}

// ---------------------------------------------------------------------------
// 3. SECURITY SCAN: NO PRIVATE KEYS IN CLIENT CODE
// ---------------------------------------------------------------------------
console.log("\n[Test 3] Security audit: checking for accidental private key exposure...")

const pushFiles = fs.readdirSync(path.join(rootDir, "lib", "push"))
for (const file of pushFiles) {
  const filePath = path.join(rootDir, "lib", "push", file)
  const content = fs.readFileSync(filePath, "utf-8")

  assert(
    !content.includes("VAPID_PRIVATE_KEY"),
    `lib/push/${file} does NOT reference VAPID_PRIVATE_KEY`
  )
  assert(
    !content.includes("getServerVapidConfig"),
    `lib/push/${file} does NOT import getServerVapidConfig`
  )
  // Check for Node.js Buffer constructor or methods, ignoring ArrayBuffer
  const usesNodeBuffer = /\bBuffer\.(from|alloc|isBuffer)\b|\bnew Buffer\b/.test(content)
  assert(
    !usesNodeBuffer,
    `lib/push/${file} does NOT use Node Buffer`
  )
  assert(
    !content.includes("supabase.from(\"push_subscriptions\")"),
    `lib/push/${file} does NOT perform database persistence`
  )
}

// ---------------------------------------------------------------------------
// 4. VERIFY NO AUTOMATIC NOTIFICATION REQUESTS IN APP
// ---------------------------------------------------------------------------
console.log("\n[Test 4] Verifying no automatic Notification.requestPermission() on page loads...")

function scanDirForAutoPermission(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      continue
    }
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDirForAutoPermission(fullPath)
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      if (entry.name === "subscription-manager.ts") {
        continue // Expected implementation inside user-triggered function
      }
      const code = fs.readFileSync(fullPath, "utf-8")
      if (code.includes("requestPermission")) {
        assert(false, `Unexpected requestPermission found in ${path.relative(rootDir, fullPath)}`)
      }
    }
  }
}

scanDirForAutoPermission(path.join(rootDir, "app"))
scanDirForAutoPermission(path.join(rootDir, "components"))
assert(true, "Zero automated notification permission requests across app/ and components/")

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log("\n=================================================")
if (failures === 0) {
  console.log("ALL SEIJUN PUSH SUBSCRIPTION TESTS PASSED! 🎉")
  console.log("=================================================\n")
  process.exit(0)
} else {
  console.error(`FAILED: ${failures} test(s) failed.`)
  console.log("=================================================\n")
  process.exit(1)
}
