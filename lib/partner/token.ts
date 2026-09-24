import crypto from "crypto"

export const INVITATION_EXPIRATION_DAYS = 7
export const INVITATION_EXPIRATION_MS = INVITATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000

/**
 * Generates a cryptographically secure random invitation token.
 * Uses 32 bytes (256 bits) of entropy formatted as a hex string (64 characters).
 *
 * Security Invariants:
 * - Does NOT use timestamps, sequential IDs, or usernames.
 * - Does NOT embed or expose raw user IDs or relationship IDs.
 * - Cryptographically non-predictable.
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Computes the deterministic SHA-256 hash of a raw invitation token.
 * Only this hash is stored at rest in the database; raw tokens are never persisted.
 */
export function hashInvitationToken(rawToken: string): string {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid raw token provided for hashing.")
  }
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex")
}

/**
 * Constant-time comparison to verify whether a candidate raw token matches a stored hash.
 * Protects against timing analysis attacks.
 */
export function verifyTokenHash(rawToken: string, storedHash: string): boolean {
  if (!rawToken || !storedHash || typeof rawToken !== "string" || typeof storedHash !== "string") {
    return false
  }

  try {
    const computedHash = hashInvitationToken(rawToken)
    const computedBuffer = Buffer.from(computedHash, "hex")
    const storedBuffer = Buffer.from(storedHash, "hex")

    if (computedBuffer.length !== storedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(computedBuffer, storedBuffer)
  } catch {
    return false
  }
}

/**
 * Calculates the exact expiration timestamp for a new invitation (exactly 7 days from now).
 */
export function calculateInvitationExpiry(fromTimestamp: number = Date.now()): Date {
  return new Date(fromTimestamp + INVITATION_EXPIRATION_MS)
}

/**
 * Checks whether an invitation timestamp has expired relative to the provided reference time.
 */
export function isInvitationExpired(
  expiresAt: string | Date,
  referenceTime: number = Date.now()
): boolean {
  const expiryTime = typeof expiresAt === "string" ? new Date(expiresAt).getTime() : expiresAt.getTime()
  if (isNaN(expiryTime)) {
    return true
  }
  return expiryTime <= referenceTime
}
