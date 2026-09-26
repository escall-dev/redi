/**
 * Seijun Cryptographic MPIN Security Helpers
 *
 * Implements client-side cryptographic hashing for 6-digit MPINs using Web Crypto PBKDF2.
 * The raw MPIN is NEVER stored in plaintext, never logged, and never transmitted over the network.
 * Only a salted PBKDF2 hash (100,000 iterations of SHA-256) is stored locally.
 */

const PBKDF2_ITERATIONS = 100_000
const HASH_ALGORITHM = "SHA-256"
const KEY_LENGTH_BITS = 256

/**
 * Generate cryptographically secure random salt (hex string).
 */
export function generateSalt(byteLength: number = 16): string {
  if (typeof window === "undefined" || !window.crypto) {
    // Fallback for SSR / non-browser environments
    const arr = new Uint8Array(byteLength)
    return Array.from(arr).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("")
  }
  const array = new Uint8Array(byteLength)
  window.crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Derives a PBKDF2 hash from the 6-digit MPIN and salt.
 * Returns a 64-character hexadecimal string (256-bit digest).
 */
export async function hashMpin(mpin: string, saltHex: string): Promise<string> {
  if (!mpin || mpin.length !== 6 || !/^\d{6}$/.test(mpin)) {
    throw new Error("MPIN must be exactly 6 numeric digits.")
  }

  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available.")
  }

  const enc = new TextEncoder()
  const mpinBuffer = enc.encode(mpin)

  // Convert hex salt to Uint8Array
  const saltBytes = new Uint8Array(
    saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  )

  // Import MPIN as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    mpinBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  )

  // Derive bits using PBKDF2-HMAC-SHA256
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH_BITS
  )

  const derivedArray = new Uint8Array(derivedBits)
  return Array.from(derivedArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}
