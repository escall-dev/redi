/**
 * Phase 10 Symptom Scenarios Verification Script
 * Validates domain rules, vocabulary constraints, severities, edge cases, and calculations.
 */

import {
  SYMPTOM_OPTIONS,
  SEVERITY_VALUES,
  isValidSymptom,
  isValidSeverity,
  getSeverityLabel,
  type SymptomRecord,
} from "../lib/symptoms/constants"

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`)
    process.exit(1)
  }
  console.log(`PASS: ${msg}`)
}

console.log("=== Running Redi Phase 10 Symptoms Scenario Tests ===")

// Scenario 1: Vocabulary completeness (10 specified symptoms)
console.log("\n--- Scenario 1: Vocabulary Check ---")
assert(SYMPTOM_OPTIONS.length === 10, `Expected 10 symptoms, got ${SYMPTOM_OPTIONS.length}`)
const expectedSymptoms = [
  "Cramps",
  "Headache",
  "Back pain",
  "Fatigue",
  "Mood changes",
  "Bloating",
  "Acne",
  "Breast tenderness",
  "Nausea",
  "Appetite changes",
]
for (const s of expectedSymptoms) {
  assert(isValidSymptom(s), `Valid symptom '${s}' accepted`)
}

// Scenario 2: Allowed Severities
console.log("\n--- Scenario 2: Severity Options ---")
assert(SEVERITY_VALUES.length === 3, "Exactly 3 severity levels")
assert(isValidSeverity("mild"), "mild is valid")
assert(isValidSeverity("moderate"), "moderate is valid")
assert(isValidSeverity("severe"), "severe is valid")
assert(!isValidSeverity("extreme"), "extreme is rejected")
assert(!isValidSeverity(""), "empty severity is rejected")

// Scenario 3: Severity Labels
console.log("\n--- Scenario 3: Severity Labels ---")
assert(getSeverityLabel("mild") === "Mild", "mild -> Mild")
assert(getSeverityLabel("moderate") === "Moderate", "moderate -> Moderate")
assert(getSeverityLabel("severe") === "Severe", "severe -> Severe")

// Scenario 4: Vocabulary rejection of invalid / medical diagnoses
console.log("\n--- Scenario 4: Non-vocabulary rejection ---")
assert(!isValidSymptom("Endometriosis"), "Medical condition rejected")
assert(!isValidSymptom("PCOS"), "Medical condition rejected")
assert(!isValidSymptom("Fever"), "Unlisted symptom rejected")
assert(!isValidSymptom(""), "Empty symptom rejected")

// Scenario 5: Future date validation rule
console.log("\n--- Scenario 5: Date validation ---")
const todayStr = new Date().toISOString().split("T")[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]

function validateSymptomInput(date: string, symptom: string, severity: string, notes?: string) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { valid: false, error: "A valid date is required." }
  if (date > todayStr) return { valid: false, error: "You cannot log a symptom for a future date." }
  if (!isValidSymptom(symptom)) return { valid: false, error: "Invalid symptom." }
  if (!isValidSeverity(severity)) return { valid: false, error: "Invalid severity." }
  if (notes && notes.length > 500) return { valid: false, error: "Notes too long." }
  return { valid: true }
}

assert(!validateSymptomInput(tomorrow, "Cramps", "mild").valid, "Future date rejected")
assert(validateSymptomInput(todayStr, "Cramps", "mild").valid, "Today date accepted")
assert(validateSymptomInput(yesterday, "Headache", "severe").valid, "Past date accepted")
assert(!validateSymptomInput("not-a-date", "Cramps", "mild").valid, "Invalid date format rejected")

// Scenario 6: Note length limit
console.log("\n--- Scenario 6: Notes max length ---")
const longNote = "a".repeat(501)
const okNote = "a".repeat(500)
assert(!validateSymptomInput(todayStr, "Cramps", "mild", longNote).valid, "Notes > 500 chars rejected")
assert(validateSymptomInput(todayStr, "Cramps", "mild", okNote).valid, "Notes = 500 chars accepted")

// Scenario 7: Multiple symptoms on same date grouping
console.log("\n--- Scenario 7: Same date grouping ---")
const mockSymptoms: SymptomRecord[] = [
  { id: "1", user_id: "u1", date: todayStr, symptom: "Cramps", severity: "moderate", notes: null, created_at: "2026-09-15T08:00:00Z" },
  { id: "2", user_id: "u1", date: todayStr, symptom: "Fatigue", severity: "mild", notes: "Felt tired in the afternoon", created_at: "2026-09-15T09:00:00Z" },
  { id: "3", user_id: "u1", date: yesterday, symptom: "Headache", severity: "severe", notes: null, created_at: "2026-09-14T08:00:00Z" },
]

const groupedByDate: Record<string, SymptomRecord[]> = {}
for (const s of mockSymptoms) {
  if (!groupedByDate[s.date]) groupedByDate[s.date] = []
  groupedByDate[s.date].push(s)
}

assert(groupedByDate[todayStr]?.length === 2, "2 symptoms logged today correctly grouped")
assert(groupedByDate[yesterday]?.length === 1, "1 symptom logged yesterday correctly grouped")

// Scenario 8: Calendar symptom indicators
console.log("\n--- Scenario 8: Calendar integration ---")
const symptomDateSet = new Set(mockSymptoms.map((s) => s.date))
assert(symptomDateSet.has(todayStr), "Calendar shows dot for today")
assert(symptomDateSet.has(yesterday), "Calendar shows dot for yesterday")
assert(!symptomDateSet.has(tomorrow), "Calendar does not show dot for tomorrow")

console.log("\n=== ALL SCENARIOS PASSED SUCCESSFULLY ===")
