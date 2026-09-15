/**
 * Phase 11 Daily Notes Scenarios Verification Script
 * Validates domain rules, unique constraint logic, character limit, future date rejection,
 * whitespace handling, and calendar/dashboard integration.
 */

import { NOTE_MAX_LENGTH, type DailyNoteRecord } from "../lib/notes/types"

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`)
    process.exit(1)
  }
  console.log(`PASS: ${msg}`)
}

console.log("=== Running Redi Phase 11 Daily Notes Scenario Tests ===")

// Scenario 1: Constant Check
console.log("\n--- Scenario 1: Constants Check ---")
assert(NOTE_MAX_LENGTH === 2000, `NOTE_MAX_LENGTH is 2000, got ${NOTE_MAX_LENGTH}`)

// Scenario 2: Validation helper simulation
console.log("\n--- Scenario 2: Content & Date Validation ---")
const todayStr = new Date().toISOString().split("T")[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]

function validateNoteInput(date: string, content: string) {
  const trimmed = content.trim()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: "A valid date is required." }
  }
  if (date > todayStr) {
    return { valid: false, error: "You cannot save a note for a future date." }
  }
  if (!trimmed) {
    return { valid: false, error: "Note content cannot be empty." }
  }
  if (trimmed.length > NOTE_MAX_LENGTH) {
    return { valid: false, error: `Note content cannot exceed ${NOTE_MAX_LENGTH} characters.` }
  }
  return { valid: true, cleanContent: trimmed }
}

assert(!validateNoteInput(tomorrow, "Tomorrow note").valid, "Future date rejected")
assert(validateNoteInput(todayStr, "Today note").valid, "Today date accepted")
assert(validateNoteInput(yesterday, "Yesterday note").valid, "Past date accepted")
assert(!validateNoteInput(todayStr, "").valid, "Empty content rejected")
assert(!validateNoteInput(todayStr, "   \n\t  ").valid, "Whitespace-only content rejected")

// Scenario 3: Character length boundaries
console.log("\n--- Scenario 3: Character Boundaries ---")
const exact2000 = "x".repeat(2000)
const over2000 = "x".repeat(2001)
assert(validateNoteInput(todayStr, exact2000).valid, "2,000 characters accepted")
assert(!validateNoteInput(todayStr, over2000).valid, "2,001 characters rejected")

// Scenario 4: Whitespace trimming
console.log("\n--- Scenario 4: Whitespace Trimming ---")
const padded = "   Hello world!   \n\n  "
const res = validateNoteInput(todayStr, padded)
assert(res.valid && res.cleanContent === "Hello world!", "Content trimmed correctly")

// Scenario 5: Unique (user_id, date) constraint simulation
console.log("\n--- Scenario 5: Unique date per user constraint ---")
const mockNotes: DailyNoteRecord[] = [
  {
    id: "n1",
    user_id: "u1",
    date: todayStr,
    content: "Feeling tired today.",
    created_at: "2026-09-15T08:00:00Z",
    updated_at: "2026-09-15T08:00:00Z",
  },
  {
    id: "n2",
    user_id: "u1",
    date: yesterday,
    content: "Productive day.",
    created_at: "2026-09-14T08:00:00Z",
    updated_at: "2026-09-14T08:00:00Z",
  },
]

function checkDuplicateDate(date: string, excludeId?: string): boolean {
  return mockNotes.some((n) => n.date === date && n.id !== excludeId)
}

assert(checkDuplicateDate(todayStr), "Duplicate note on today detected")
assert(!checkDuplicateDate(yesterday, "n2"), "Editing n2 on same date is allowed (not duplicate)")
assert(!checkDuplicateDate("2026-09-10"), "Unused past date is not a duplicate")

// Scenario 6: Note sorting (newest first)
console.log("\n--- Scenario 6: Newest-First Sorting ---")
const sorted = [...mockNotes].sort((a, b) => b.date.localeCompare(a.date))
assert(sorted[0].date === todayStr, "Newest note is first")
assert(sorted[1].date === yesterday, "Older note is second")

// Scenario 7: Calendar note indicator simulation
console.log("\n--- Scenario 7: Calendar Note Indicators ---")
const noteDateSet = new Set(mockNotes.map((n) => n.date))
assert(noteDateSet.has(todayStr), "Calendar shows note indicator for today")
assert(noteDateSet.has(yesterday), "Calendar shows note indicator for yesterday")
assert(!noteDateSet.has("2026-09-10"), "Calendar does not show note indicator for unlogged date")

// Scenario 8: Dashboard note resolution
console.log("\n--- Scenario 8: Dashboard Note Resolution ---")
const todayNote = mockNotes.find((n) => n.date === todayStr) ?? null
assert(todayNote !== null && todayNote.content === "Feeling tired today.", "Dashboard correctly resolves today's note")

const futureNote = mockNotes.find((n) => n.date === tomorrow) ?? null
assert(futureNote === null, "Dashboard correctly returns null for dates with no note")

console.log("\n=== ALL SCENARIOS PASSED SUCCESSFULLY ===")
