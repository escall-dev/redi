import * as React from "react"
import { cn } from "@/lib/utils"

export interface SeijunSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Spinner size variant
   * - sm: 20px (e.g. for buttons, chips, tight spaces)
   * - md: 32px (standard section and inline loader)
   * - lg: 44px (recommended for centered modal / overlay loader)
   * - xl: 56px (large display)
   */
  size?: "sm" | "md" | "lg" | "xl"
  /**
   * Accessible label for assistive technology
   * @default "Loading..."
   */
  label?: string
  /**
   * Whether to display the text label below the spinner
   * @default false
   */
  showLabel?: boolean
  /**
   * Additional class names for the label text
   */
  labelClassName?: string
}

const sizeConfig = {
  sm: {
    container: "size-5",
    strokeWidth: 3.5,
    radius: 16,
    circumference: 100.53,
    purpleDash: "52 48.53",
    whiteDash: "24 76.53",
    whiteOffset: "-38",
  },
  md: {
    container: "size-8",
    strokeWidth: 3.75,
    radius: 16,
    circumference: 100.53,
    purpleDash: "54 46.53",
    whiteDash: "26 74.53",
    whiteOffset: "-40",
  },
  lg: {
    container: "size-11",
    strokeWidth: 4,
    radius: 16,
    circumference: 100.53,
    purpleDash: "55 45.53",
    whiteDash: "28 72.53",
    whiteOffset: "-42",
  },
  xl: {
    container: "size-14",
    strokeWidth: 4.5,
    radius: 16,
    circumference: 100.53,
    purpleDash: "56 44.53",
    whiteDash: "30 70.53",
    whiteOffset: "-44",
  },
}

/**
 * Seijun Loading Spinner
 *
 * Distinctive Purple & White loading spinner matching Seijun's primary
 * color token (`--primary`) alongside clean secondary white.
 *
 * Built with accessible SVG arcs, linear rotation, and automatic
 * `prefers-reduced-motion` compliance.
 */
export function SeijunSpinner({
  size = "md",
  label = "Loading...",
  showLabel = false,
  labelClassName,
  className,
  ...props
}: SeijunSpinnerProps) {
  const config = sizeConfig[size]

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("inline-flex flex-col items-center justify-center gap-2.5", className)}
      {...props}
    >
      <svg
        className={cn(
          config.container,
          "motion-safe:animate-spin motion-safe:[animation-duration:800ms] motion-safe:[animation-timing-function:linear]",
          "motion-reduce:animate-none motion-reduce:opacity-90",
          "drop-shadow-[0_1px_2px_rgba(76,45,115,0.22)] dark:drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]",
          "shrink-0"
        )}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Subtle background track in soft lavender-tinted purple */}
        <circle
          cx="20"
          cy="20"
          r={config.radius}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-primary/20 dark:text-primary/25"
        />

        {/* Primary Seijun Purple Arc (~55% circumference) */}
        <circle
          cx="20"
          cy="20"
          r={config.radius}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={config.purpleDash}
          className="text-primary"
        />

        {/* Secondary White Arc (~25% circumference leading segment) */}
        <circle
          cx="20"
          cy="20"
          r={config.radius}
          stroke="#ffffff"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={config.whiteDash}
          strokeDashoffset={config.whiteOffset}
          className="stroke-white"
        />
      </svg>

      {showLabel && (
        <span
          className={cn(
            "text-xs font-medium text-foreground tracking-tight select-none",
            labelClassName
          )}
        >
          {label}
        </span>
      )}

      {/* Screen-reader announcement text */}
      <span className="sr-only">{label}</span>
    </div>
  )
}
