/**
 * Redi Supabase Configuration & Environment Validation
 */

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()

  return {
    url,
    key,
    isConfigured: Boolean(url && key),
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv().isConfigured
}

export function assertSupabaseConfigured(): { url: string; key: string } {
  const { url, key, isConfigured } = getSupabaseEnv()

  if (!isConfigured || !url || !key) {
    throw new Error(
      "Supabase is not configured. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env.local file."
    )
  }

  return { url, key }
}
