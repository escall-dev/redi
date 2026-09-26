import * as React from "react"

export interface SeijunSkylineProps {
  className?: string
}

/**
 * Seijun Botanical & Wellness Skyline Illustration
 *
 * Designed in Seijun's signature lavender and primary palette to match the
 * reference layout aesthetic while staying true to Seijun's brand identity.
 */
export function SeijunSkyline({ className }: SeijunSkylineProps = {}) {
  return (
    <div className={className} aria-hidden="true">
      <svg
        viewBox="0 0 400 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto select-none pointer-events-none opacity-85"
      >
        <defs>
          <linearGradient id="skylineGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="skylineGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="skylineGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Distant skyline buildings */}
        <rect x="25" y="45" width="22" height="75" rx="3" fill="url(#skylineGrad1)" />
        <rect x="52" y="30" width="26" height="90" rx="3" fill="url(#skylineGrad1)" />
        <rect x="83" y="50" width="20" height="70" rx="3" fill="url(#skylineGrad1)" />
        <rect x="108" y="20" width="30" height="100" rx="4" fill="url(#skylineGrad1)" />
        <rect x="143" y="38" width="24" height="82" rx="3" fill="url(#skylineGrad1)" />
        <rect x="172" y="15" width="34" height="105" rx="4" fill="url(#skylineGrad1)" />
        <rect x="211" y="28" width="28" height="92" rx="3" fill="url(#skylineGrad1)" />
        <rect x="244" y="48" width="22" height="72" rx="3" fill="url(#skylineGrad1)" />
        <rect x="271" y="22" width="32" height="98" rx="4" fill="url(#skylineGrad1)" />
        <rect x="308" y="35" width="26" height="85" rx="3" fill="url(#skylineGrad1)" />
        <rect x="339" y="52" width="24" height="68" rx="3" fill="url(#skylineGrad1)" />

        {/* Mid-ground modern towers */}
        <rect x="65" y="42" width="24" height="78" rx="4" fill="url(#skylineGrad2)" />
        <rect x="120" y="32" width="28" height="88" rx="4" fill="url(#skylineGrad2)" />
        <rect x="180" y="24" width="32" height="96" rx="5" fill="url(#skylineGrad2)" />
        <rect x="230" y="36" width="26" height="84" rx="4" fill="url(#skylineGrad2)" />
        <rect x="285" y="30" width="30" height="90" rx="4" fill="url(#skylineGrad2)" />

        {/* Foreground architectural blocks with window accents */}
        <rect x="95" y="55" width="30" height="65" rx="4" fill="url(#skylineGrad3)" />
        <circle cx="110" cy="70" r="2" fill="var(--primary)" opacity="0.4" />
        <circle cx="110" cy="80" r="2" fill="var(--primary)" opacity="0.4" />
        <circle cx="110" cy="90" r="2" fill="var(--primary)" opacity="0.4" />

        <rect x="150" y="45" width="34" height="75" rx="4" fill="url(#skylineGrad3)" />
        <circle cx="162" cy="60" r="2" fill="var(--primary)" opacity="0.5" />
        <circle cx="172" cy="60" r="2" fill="var(--primary)" opacity="0.5" />
        <circle cx="162" cy="72" r="2" fill="var(--primary)" opacity="0.5" />
        <circle cx="172" cy="72" r="2" fill="var(--primary)" opacity="0.5" />

        <rect x="215" y="50" width="32" height="70" rx="4" fill="url(#skylineGrad3)" />
        <circle cx="226" cy="65" r="2" fill="var(--primary)" opacity="0.5" />
        <circle cx="236" cy="65" r="2" fill="var(--primary)" opacity="0.5" />
        <circle cx="226" cy="78" r="2" fill="var(--primary)" opacity="0.5" />
        <circle cx="236" cy="78" r="2" fill="var(--primary)" opacity="0.5" />

        <rect x="260" y="60" width="28" height="60" rx="4" fill="url(#skylineGrad3)" />

        {/* Horizon baseline wave */}
        <path
          d="M0 114 Q 100 110, 200 114 T 400 114 L 400 120 L 0 120 Z"
          fill="var(--primary)"
          opacity="0.15"
        />
        <path
          d="M0 117 Q 120 115, 240 118 T 400 117 L 400 120 L 0 120 Z"
          fill="var(--primary)"
          opacity="0.25"
        />
      </svg>
    </div>
  )
}
