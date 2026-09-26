"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface MpinInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: boolean
  label?: string
  showClear?: boolean
  onClear?: () => void
  autoFocus?: boolean
  className?: string
  maskDigits?: boolean
}

/**
 * Seijun 6-Digit MPIN Input Component
 *
 * Provides a specialized 6-box numeric keypad interface adhering to Seijun's
 * lavender design system and matching the eGovPH reference layout.
 * Supports auto-advance, backspace navigation, paste handling, and native mobile numeric keyboards.
 */
export function MpinInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  label = "Enter your MPIN",
  showClear = true,
  onClear,
  autoFocus = true,
  className,
  maskDigits = true,
}: MpinInputProps) {
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([])

  // Ensure digits array always has length 6
  const digits = React.useMemo(() => {
    const d = value.split("").slice(0, 6)
    while (d.length < 6) {
      d.push("")
    }
    return d
  }, [value])

  // Initial auto-focus
  React.useEffect(() => {
    if (autoFocus && !disabled && inputsRef.current[0]) {
      // Focus first empty slot or first input
      const firstEmptyIndex = digits.findIndex((d) => !d)
      const targetIndex = firstEmptyIndex === -1 ? 5 : firstEmptyIndex
      inputsRef.current[targetIndex]?.focus()
    }
  }, [autoFocus, disabled])

  const handleClear = React.useCallback(() => {
    onChange("")
    onClear?.()
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [onChange, onClear])

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const rawVal = e.target.value

    // If empty (e.g. deleted)
    if (!rawVal) {
      const newDigits = [...digits]
      newDigits[index] = ""
      const newVal = newDigits.join("")
      onChange(newVal)
      return
    }

    // Only allow numeric input
    const cleanNumbers = rawVal.replace(/\D/g, "")
    if (!cleanNumbers) return

    // If multiple characters (e.g. auto-fill or fast typing)
    if (cleanNumbers.length > 1) {
      const remainingSlots = 6 - index
      const toInsert = cleanNumbers.slice(0, remainingSlots).split("")
      const newDigits = [...digits]
      toInsert.forEach((char, i) => {
        if (index + i < 6) {
          newDigits[index + i] = char
        }
      })
      const newVal = newDigits.join("")
      onChange(newVal)

      const nextFocus = Math.min(5, index + toInsert.length)
      inputsRef.current[nextFocus]?.focus()

      if (newVal.length === 6) {
        onComplete?.(newVal)
      }
      return
    }

    // Single numeric digit
    const char = cleanNumbers.slice(-1)
    const newDigits = [...digits]
    newDigits[index] = char
    const newVal = newDigits.join("")
    onChange(newVal)

    // Advance to next input
    if (index < 5) {
      inputsRef.current[index + 1]?.focus()
    }

    if (newVal.length === 6) {
      onComplete?.(newVal)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Current slot is empty, jump back to previous and clear it
        const newDigits = [...digits]
        newDigits[index - 1] = ""
        const newVal = newDigits.join("")
        onChange(newVal)
        inputsRef.current[index - 1]?.focus()
        e.preventDefault()
      } else if (digits[index]) {
        // Clear current slot
        const newDigits = [...digits]
        newDigits[index] = ""
        const newVal = newDigits.join("")
        onChange(newVal)
        e.preventDefault()
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus()
      e.preventDefault()
    } else if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus()
      e.preventDefault()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return

    onChange(pasted)
    const targetFocus = Math.min(5, pasted.length)
    inputsRef.current[targetFocus]?.focus()

    if (pasted.length === 6) {
      onComplete?.(pasted)
    }
  }

  return (
    <div className={cn("w-full space-y-2.5", className)}>
      {/* Label and Clear row matching reference layout */}
      {(label || showClear) && (
        <div className="flex items-center justify-between px-0.5">
          {label && (
            <span className="text-sm font-semibold text-foreground tracking-tight">
              {label}
            </span>
          )}
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled || value.length === 0}
              className="text-sm font-semibold text-foreground/90 hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* 6 Digit Input Boxes (Minimal Outline Style) */}
      <div
        role="group"
        aria-label="6-digit MPIN input"
        className="flex items-center justify-between gap-2 sm:gap-2.5"
      >
        {digits.map((digit, index) => {
          const isFilled = Boolean(digit)
          return (
            <div key={index} className="relative flex-1">
              <input
                ref={(el) => {
                  inputsRef.current[index] = el
                }}
                type={maskDigits ? "password" : "text"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoComplete="off"
                disabled={disabled}
                value={digit}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                aria-label={`Digit ${index + 1} of 6`}
                className={cn(
                  "w-full h-14 sm:h-16 text-center text-2xl font-bold font-mono rounded-[14px] sm:rounded-2xl transition-all outline-none",
                  "border border-slate-300 dark:border-slate-700 bg-white dark:bg-card text-foreground shadow-2xs",
                  isFilled && "border-slate-400 dark:border-slate-500",
                  error
                    ? "border-destructive text-destructive ring-2 ring-destructive/20"
                    : "focus:border-primary focus:ring-2 focus:ring-primary/25",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
