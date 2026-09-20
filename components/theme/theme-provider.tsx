"use client"

import * as React from "react"

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  mounted: boolean
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "seijun-theme"
const THEME_CHANGE_EVENT = "seijun-theme-change"

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system"
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored
    }
  } catch {
    // Ignore storage restrictions
  }
  return "system"
}

function applyThemeToDOM(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (resolved === "dark") {
    root.classList.add("dark")
    root.style.colorScheme = "dark"
  } else {
    root.classList.remove("dark")
    root.style.colorScheme = "light"
  }

  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      "content",
      resolved === "dark" ? "#160523" : "#7152b5"
    )
  }
}

function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {}

  const handleCustom = () => callback()
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback()
  }
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  const handleMedia = () => callback()

  window.addEventListener(THEME_CHANGE_EVENT, handleCustom)
  window.addEventListener("storage", handleStorage)
  mediaQuery.addEventListener("change", handleMedia)

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleCustom)
    window.removeEventListener("storage", handleStorage)
    mediaQuery.removeEventListener("change", handleMedia)
  }
}

function subscribeMounted(callback: () => void) {
  if (typeof window === "undefined") return () => {}
  window.addEventListener("focus", callback)
  return () => window.removeEventListener("focus", callback)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribeTheme,
    getStoredTheme,
    () => "system" as Theme
  )

  const mounted = React.useSyncExternalStore(
    subscribeMounted,
    () => true,
    () => false
  )

  const resolvedTheme: ResolvedTheme = React.useMemo(() => {
    if (theme === "system") {
      return getSystemTheme()
    }
    return theme
  }, [theme])

  React.useEffect(() => {
    applyThemeToDOM(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = React.useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {
      // Storage access restricted
    }
    applyThemeToDOM(newTheme === "system" ? getSystemTheme() : newTheme)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
