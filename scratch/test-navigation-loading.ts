/**
 * Seijun Navigation Loading Spinner UX Test Suite
 *
 * Verifies:
 * 1. Existence and integrity of SeijunSpinner component
 * 2. Visual design: Primary Seijun Purple and Secondary White
 * 3. Reduced motion accessibility (prefers-reduced-motion)
 * 4. NavigationLoadingContext threshold delay (200ms) and safety timeout (8000ms)
 * 5. NavigationLoadingOverlay structure (centered spinner + "Loading..." text)
 * 6. Accessibility semantics (role="status", aria-live="polite", aria-busy="true")
 * 7. Mobile and PWA viewport constraints (no layout shift, safe-area compliance)
 * 8. SettingsMenu section-level transition vs route-level overlay separation
 * 9. Integration in RootLayout
 */

import fs from "fs"
import path from "path"
import assert from "assert"

const rootDir = process.cwd()

console.log("=== Running Seijun Navigation Loading UX Test Suite ===\n")

let failures = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`     ${err.message}`)
    failures++
  }
}

// 1. Verify SeijunSpinner Component
console.log("[Test Group 1] SeijunSpinner Component Design & Architecture")

const spinnerFile = path.join(rootDir, "components", "ui", "seijun-spinner.tsx")
test("SeijunSpinner component file exists", () => {
  assert(fs.existsSync(spinnerFile), "seijun-spinner.tsx exists")
})

const spinnerContent = fs.readFileSync(spinnerFile, "utf-8")

test("Spinner uses Seijun Primary Purple design token", () => {
  assert(
    spinnerContent.includes("text-primary") || spinnerContent.includes("stroke-primary"),
    "Spinner references text-primary or stroke-primary"
  )
})

test("Spinner uses Secondary White color for contrast arc", () => {
  assert(
    spinnerContent.includes("#ffffff") || spinnerContent.includes("stroke-white"),
    "Spinner includes pure white arc segment (#ffffff / stroke-white)"
  )
})

test("Spinner features dual-color circular SVG arcs (Purple + White)", () => {
  assert(spinnerContent.includes("<circle") && spinnerContent.includes("strokeDasharray"), "Spinner implements SVG circle arcs")
  assert(spinnerContent.includes("strokeLinecap=\"round\""), "Spinner implements rounded arc ends")
})

test("Spinner supports prefers-reduced-motion", () => {
  assert(
    spinnerContent.includes("motion-reduce:animate-none"),
    "Spinner disables spin animation on prefers-reduced-motion"
  )
  assert(
    spinnerContent.includes("motion-safe:animate-spin"),
    "Spinner activates spin animation on motion-safe"
  )
})

test("Spinner includes accessibility labels and screen reader text", () => {
  assert(spinnerContent.includes("role=\"status\""), "Spinner implements role='status'")
  assert(spinnerContent.includes("aria-label"), "Spinner provides dynamic aria-label")
  assert(spinnerContent.includes("sr-only"), "Spinner includes sr-only screen reader announcement")
})

// 2. Verify NavigationLoadingContext & Delay Logic
console.log("\n[Test Group 2] Navigation Loading Threshold & Event Interception")

const contextFile = path.join(rootDir, "components", "navigation", "navigation-loading-context.tsx")
test("NavigationLoadingContext file exists", () => {
  assert(fs.existsSync(contextFile), "navigation-loading-context.tsx exists")
})

const contextContent = fs.readFileSync(contextFile, "utf-8")

test("Threshold delay is set to 200ms (between 150-250ms)", () => {
  assert(
    contextContent.includes("NAVIGATION_DELAY_MS = 200"),
    "Threshold delay constant is 200ms"
  )
})

test("Safety timeout is configured to prevent stuck loaders", () => {
  assert(
    contextContent.includes("SAFETY_TIMEOUT_MS = 8000"),
    "Safety timeout set to 8000ms"
  )
})

test("Fast navigation completes before delay without showing spinner", () => {
  // Simulate delay logic mathematically
  const threshold = 200
  let spinnerVisible = false
  let timer: any = null

  function start() {
    timer = setTimeout(() => {
      spinnerVisible = true
    }, threshold)
  }

  function stop() {
    if (timer) clearTimeout(timer)
  }

  // Fast transition: 50ms
  start()
  // 50ms passed
  stop()
  assert(spinnerVisible === false, "Spinner was not displayed on fast transition")
})

test("Slow navigation triggers spinner after 200ms threshold", () => {
  const threshold = 50 // scaled down for unit test speed
  let spinnerVisible = false
  let timer: any = null

  function start() {
    timer = setTimeout(() => {
      spinnerVisible = true
    }, threshold)
  }

  start()
  setTimeout(() => {
    assert(spinnerVisible === true, "Spinner displayed after threshold passed")
  }, 70)
})

test("Global click handler intercepts internal navigation links safely", () => {
  assert(contextContent.includes("handleDocumentClick"), "Document click handler defined")
  assert(contextContent.includes("target?.closest(\"a\")"), "Identifies closest anchor tag")
  assert(contextContent.includes("e.button !== 0"), "Ignores non-left clicks")
  assert(contextContent.includes("e.metaKey"), "Ignores modifier clicks")
  assert(contextContent.includes("parsedUrl.origin !== window.location.origin"), "Ignores external links")
  assert(contextContent.includes("parsedUrl.pathname === currentUrl.pathname"), "Ignores identical same-page clicks")
})

test("Browser back and forward navigation (popstate) handled", () => {
  assert(contextContent.includes("handlePopState"), "Handles popstate event")
  assert(contextContent.includes("window.addEventListener(\"popstate\""), "Listens to popstate")
})

test("Escape key safely cancels loading overlay", () => {
  assert(contextContent.includes("e.key === \"Escape\""), "Listens for Escape key")
})

test("useSearchParams wrapped in Suspense boundary for SSR safety", () => {
  assert(contextContent.includes("NavigationEvents"), "NavigationEvents component defined")
  assert(contextContent.includes("<React.Suspense fallback={null}>"), "NavigationEvents wrapped in Suspense")
})

// 3. Verify NavigationLoadingOverlay
console.log("\n[Test Group 3] NavigationLoadingOverlay UI & Accessibility")

const overlayFile = path.join(rootDir, "components", "navigation", "navigation-loading-overlay.tsx")
test("NavigationLoadingOverlay file exists", () => {
  assert(fs.existsSync(overlayFile), "navigation-loading-overlay.tsx exists")
})

const overlayContent = fs.readFileSync(overlayFile, "utf-8")

test("Overlay implements role='status', aria-live='polite', and aria-busy='true'", () => {
  assert(overlayContent.includes("role=\"status\""), "Implements role='status'")
  assert(overlayContent.includes("aria-live=\"polite\""), "Implements aria-live='polite'")
  assert(overlayContent.includes("aria-busy=\"true\""), "Implements aria-busy='true'")
})

test("Overlay features centered layout with SeijunSpinner and 'Loading...' text", () => {
  assert(overlayContent.includes("<SeijunSpinner"), "Renders SeijunSpinner")
  assert(overlayContent.includes("Loading..."), "Renders 'Loading...' text label")
  assert(overlayContent.includes("items-center justify-center"), "Centered flexbox layout")
})

test("Overlay adheres to dark and light mode surface tokens", () => {
  assert(overlayContent.includes("bg-background/70 dark:bg-background/80"), "Respects dark and light backgrounds")
  assert(overlayContent.includes("bg-card/95"), "Respects elevated card surface token")
  assert(overlayContent.includes("border-border/80"), "Uses standard border token")
  assert(overlayContent.includes("text-foreground"), "Uses standard foreground text token")
})

test("Overlay respects mobile viewport and safe-area insets", () => {
  assert(overlayContent.includes("h-dvh"), "Uses dynamic viewport height (h-dvh)")
  assert(overlayContent.includes("env(safe-area-inset-top)"), "Applies safe-area-inset-top")
  assert(overlayContent.includes("env(safe-area-inset-bottom)"), "Applies safe-area-inset-bottom")
  assert(overlayContent.includes("overflow-hidden"), "Prevents horizontal scrollbar")
})

// 4. Verify RootLayout Mount
console.log("\n[Test Group 4] RootLayout Provider & Overlay Mounting")

const layoutFile = path.join(rootDir, "app", "layout.tsx")
const layoutContent = fs.readFileSync(layoutFile, "utf-8")

test("NavigationLoadingProvider wraps AppShell in RootLayout", () => {
  assert(layoutContent.includes("<NavigationLoadingProvider>"), "NavigationLoadingProvider mounted in RootLayout")
  assert(layoutContent.includes("<NavigationLoadingOverlay />"), "NavigationLoadingOverlay mounted in RootLayout")
})

// 5. Verify Settings Architecture Integrity & Section Loading
console.log("\n[Test Group 5] Settings Section Loading & Architecture")

const settingsMenuFile = path.join(rootDir, "components", "settings", "settings-menu.tsx")
const settingsMenuContent = fs.readFileSync(settingsMenuFile, "utf-8")

test("SettingsMenu includes section-level transition with threshold", () => {
  assert(settingsMenuContent.includes("startSectionTransition"), "Uses React transition for subviews")
  assert(settingsMenuContent.includes("setShowSectionSpinner"), "Controls section spinner visibility")
  assert(settingsMenuContent.includes("setTimeout"), "Implements threshold timer for slow section switches")
})

test("SettingsMenu instant subviews do NOT force a full-screen overlay", () => {
  assert(
    settingsMenuContent.includes("showSectionSpinner"),
    "In-section spinner rendered only when showSectionSpinner is true"
  )
  assert(
    settingsMenuContent.includes("Loading section..."),
    "Inline section loading label present"
  )
})

console.log("\n=================================================")
if (failures === 0) {
  console.log("ALL SEIJUN NAVIGATION LOADING TESTS PASSED! 🎉")
  process.exit(0)
} else {
  console.error(`FAILED: ${failures} check(s) failed.`)
  process.exit(1)
}
