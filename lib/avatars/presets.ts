/**
 * Curated Seijun aesthetic avatar presets.
 * Each preset is an elegant, vector-crafted illustration representing calm,
 * cycle mindfulness, and botanical/celestial tranquility.
 */

export interface AvatarPreset {
  id: string
  name: string
  description: string
  bgGradient: string
  accentColor: string
  svg: string
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "lotus",
    name: "Lotus Petal",
    description: "Serenity, purity, and mindful renewal",
    bgGradient: "from-rose-100 to-lavender-100 dark:from-rose-950/60 dark:to-purple-950/60",
    accentColor: "#E11D48",
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lotus-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FCE7F3"/>
          <stop offset="1" stop-color="#EDE9FE"/>
        </linearGradient>
        <linearGradient id="lotus-petal" x1="50" y1="15" x2="50" y2="85" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FB7185"/>
          <stop offset="1" stop-color="#E11D48"/>
        </linearGradient>
        <linearGradient id="lotus-side" x1="20" y1="35" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FDA4AF"/>
          <stop offset="1" stop-color="#BE185D"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#lotus-bg)" stroke="#F43F5E" stroke-width="1.5" stroke-opacity="0.3"/>
      <!-- Outer left petal -->
      <path d="M50 78C30 75 16 56 22 40C27 27 42 36 50 62C58 36 73 27 78 40C84 56 70 75 50 78Z" fill="url(#lotus-side)" opacity="0.6"/>
      <!-- Inner left petal -->
      <path d="M50 80C34 76 25 58 33 44C40 33 48 48 50 70C52 48 60 33 67 44C75 58 66 76 50 80Z" fill="url(#lotus-petal)" opacity="0.85"/>
      <!-- Central heart petal -->
      <path d="M50 20C44 38 42 62 50 82C58 62 56 38 50 20Z" fill="url(#lotus-petal)"/>
      <circle cx="50" cy="55" r="3" fill="#FFF1F2"/>
    </svg>`,
  },
  {
    id: "moon",
    name: "Lunar Crescent",
    description: "Quiet reflection, natural rhythms, and nocturnal calm",
    bgGradient: "from-indigo-100 to-purple-100 dark:from-indigo-950/60 dark:to-purple-950/60",
    accentColor: "#6366F1",
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="moon-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stop-color="#EEF2FF"/>
          <stop offset="1" stop-color="#F5F3FF"/>
        </linearGradient>
        <linearGradient id="moon-glow" x1="30" y1="20" x2="75" y2="80" gradientUnits="userSpaceOnUse">
          <stop stop-color="#818CF8"/>
          <stop offset="1" stop-color="#4F46E5"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#moon-bg)" stroke="#6366F1" stroke-width="1.5" stroke-opacity="0.3"/>
      <!-- Crescent Moon -->
      <path d="M56 22C41 24 30 37 30 52C30 68 43 80 59 80C65 80 70 78 75 75C62 76 49 66 49 51C49 37 57 26 70 23C66 22 61 22 56 22Z" fill="url(#moon-glow)"/>
      <!-- Celestial sparkles -->
      <circle cx="70" cy="32" r="2.5" fill="#C7D2FE"/>
      <circle cx="64" cy="44" r="1.5" fill="#818CF8"/>
      <circle cx="74" cy="58" r="2" fill="#A5B4FC"/>
      <path d="M26 36L28 40L32 42L28 44L26 48L24 44L20 42L24 40L26 36Z" fill="#C7D2FE" opacity="0.8"/>
    </svg>`,
  },
  {
    id: "blossom",
    name: "Sakura Blossom",
    description: "Gentle rebirth, soft elegance, and seasonal grace",
    bgGradient: "from-pink-100 to-rose-100 dark:from-pink-950/60 dark:to-rose-950/60",
    accentColor: "#F43F5E",
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sakura-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFF1F2"/>
          <stop offset="1" stop-color="#FFE4E6"/>
        </linearGradient>
        <linearGradient id="sakura-petal" x1="50" y1="20" x2="50" y2="80" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FDA4AF"/>
          <stop offset="1" stop-color="#F43F5E"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#sakura-bg)" stroke="#FB7185" stroke-width="1.5" stroke-opacity="0.3"/>
      <!-- 5-Petal Sakura -->
      <g transform="translate(50, 50)">
        <path d="M0 -7C-6 -22 -14 -22 -8 -32C-2 -37 0 -33 0 -31C0 -33 2 -37 8 -32C14 -22 6 -22 0 -7Z" fill="url(#sakura-petal)"/>
        <path d="M0 -7C-6 -22 -14 -22 -8 -32C-2 -37 0 -33 0 -31C0 -33 2 -37 8 -32C14 -22 6 -22 0 -7Z" transform="rotate(72)" fill="url(#sakura-petal)"/>
        <path d="M0 -7C-6 -22 -14 -22 -8 -32C-2 -37 0 -33 0 -31C0 -33 2 -37 8 -32C14 -22 6 -22 0 -7Z" transform="rotate(144)" fill="url(#sakura-petal)"/>
        <path d="M0 -7C-6 -22 -14 -22 -8 -32C-2 -37 0 -33 0 -31C0 -33 2 -37 8 -32C14 -22 6 -22 0 -7Z" transform="rotate(216)" fill="url(#sakura-petal)"/>
        <path d="M0 -7C-6 -22 -14 -22 -8 -32C-2 -37 0 -33 0 -31C0 -33 2 -37 8 -32C14 -22 6 -22 0 -7Z" transform="rotate(288)" fill="url(#sakura-petal)"/>
        <circle cx="0" cy="0" r="5" fill="#FFE4E6"/>
        <circle cx="0" cy="0" r="2.5" fill="#BE123C"/>
      </g>
    </svg>`,
  },
  {
    id: "lavender",
    name: "Lavender Sprig",
    description: "Soothing aromatherapy, restful sleep, and herbal calm",
    bgGradient: "from-purple-100 to-indigo-100 dark:from-purple-950/60 dark:to-indigo-950/60",
    accentColor: "#9333EA",
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lav-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FAF5FF"/>
          <stop offset="1" stop-color="#F3E8FF"/>
        </linearGradient>
        <linearGradient id="lav-bud" x1="40" y1="20" x2="60" y2="80" gradientUnits="userSpaceOnUse">
          <stop stop-color="#C084FC"/>
          <stop offset="1" stop-color="#9333EA"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#lav-bg)" stroke="#A855F7" stroke-width="1.5" stroke-opacity="0.3"/>
      <!-- Stem -->
      <path d="M50 82C50 60 49 35 50 18" stroke="#059669" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      <!-- Buds pairs -->
      <ellipse cx="43" cy="30" rx="4.5" ry="3" transform="rotate(-25 43 30)" fill="url(#lav-bud)"/>
      <ellipse cx="57" cy="30" rx="4.5" ry="3" transform="rotate(25 57 30)" fill="url(#lav-bud)"/>
      <ellipse cx="42" cy="42" rx="5" ry="3.2" transform="rotate(-30 42 42)" fill="url(#lav-bud)"/>
      <ellipse cx="58" cy="42" rx="5" ry="3.2" transform="rotate(30 58 42)" fill="url(#lav-bud)"/>
      <ellipse cx="43" cy="54" rx="5" ry="3.2" transform="rotate(-25 43 54)" fill="url(#lav-bud)"/>
      <ellipse cx="57" cy="54" rx="5" ry="3.2" transform="rotate(25 57 54)" fill="url(#lav-bud)"/>
      <ellipse cx="45" cy="65" rx="4" ry="2.5" transform="rotate(-20 45 65)" fill="url(#lav-bud)"/>
      <ellipse cx="55" cy="65" rx="4" ry="2.5" transform="rotate(20 55 65)" fill="url(#lav-bud)"/>
      <!-- Top bloom tip -->
      <ellipse cx="50" cy="20" rx="3.5" ry="4" fill="url(#lav-bud)"/>
    </svg>`,
  },
  {
    id: "sunrise",
    name: "Radiant Sunrise",
    description: "Energizing warmth, optimism, and daily morning vitality",
    bgGradient: "from-amber-100 to-orange-100 dark:from-amber-950/60 dark:to-orange-950/60",
    accentColor: "#F59E0B",
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sun-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFFBEB"/>
          <stop offset="1" stop-color="#FEF3C7"/>
        </linearGradient>
        <linearGradient id="sun-glow" x1="50" y1="35" x2="50" y2="75" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FCD34D"/>
          <stop offset="1" stop-color="#F59E0B"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#sun-bg)" stroke="#FBBF24" stroke-width="1.5" stroke-opacity="0.3"/>
      <!-- Sun Body -->
      <circle cx="50" cy="52" r="16" fill="url(#sun-glow)"/>
      <!-- Ray aura rays -->
      <path d="M50 20V26M50 78V84M18 52H24M76 52H82M27 29L32 34M68 70L73 75M27 75L32 70M68 34L73 29" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
      <!-- Horizon arc -->
      <path d="M26 66C38 62 62 62 74 66" stroke="#D97706" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    </svg>`,
  },
  {
    id: "zenith",
    name: "Zen Ripple",
    description: "Deep equilibrium, flowing energy, and inner peace",
    bgGradient: "from-teal-100 to-cyan-100 dark:from-teal-950/60 dark:to-cyan-950/60",
    accentColor: "#0D9488",
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="zen-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stop-color="#F0FDFA"/>
          <stop offset="1" stop-color="#CCFBF1"/>
        </linearGradient>
        <linearGradient id="zen-drop" x1="50" y1="26" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop stop-color="#2DD4BF"/>
          <stop offset="1" stop-color="#0F766E"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#zen-bg)" stroke="#14B8A6" stroke-width="1.5" stroke-opacity="0.3"/>
      <!-- Water Droplet -->
      <path d="M50 26C45 35 40 42 40 48C40 54 44.5 58 50 58C55.5 58 60 54 60 48C60 42 55 35 50 26Z" fill="url(#zen-drop)"/>
      <!-- Concentric Ripples -->
      <ellipse cx="50" cy="68" rx="28" ry="8" stroke="#14B8A6" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.5"/>
      <ellipse cx="50" cy="72" rx="18" ry="5" stroke="#0D9488" stroke-width="1.5" opacity="0.7"/>
      <ellipse cx="50" cy="75" rx="8" ry="2.5" stroke="#0F766E" stroke-width="1.5" opacity="0.9"/>
    </svg>`,
  },
]

export const DEFAULT_AVATAR_PRESET_ID = "lotus"

export function getPresetById(id: string | null | undefined): AvatarPreset | undefined {
  if (!id) return undefined
  const cleanId = id.startsWith("preset:") ? id.replace("preset:", "") : id
  return AVATAR_PRESETS.find((p) => p.id === cleanId)
}

export function isPresetAvatar(urlOrId: string | null | undefined): boolean {
  if (!urlOrId) return false
  return urlOrId.startsWith("preset:") || AVATAR_PRESETS.some((p) => p.id === urlOrId)
}

export function getPresetSvg(presetId: string): string {
  const preset = getPresetById(presetId)
  return preset ? preset.svg : AVATAR_PRESETS[0].svg
}

export function getPresetDataUrl(presetId: string): string {
  const svg = getPresetSvg(presetId)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function getRandomAvatarPresetId(): string {
  const index = Math.floor(Math.random() * AVATAR_PRESETS.length)
  return AVATAR_PRESETS[index].id
}
