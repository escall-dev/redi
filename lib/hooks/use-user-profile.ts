"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"

export interface UserProfileState {
  displayName: string | null
  avatarUrl: string | null
  isLoading: boolean
}

export function useUserProfile(): UserProfileState {
  const [state, setState] = React.useState<UserProfileState>({
    displayName: null,
    avatarUrl: null,
    isLoading: true,
  })

  React.useEffect(() => {
    let isMounted = true
    const supabase = createClient()

    async function fetchProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (isMounted) {
            setState({ displayName: null, avatarUrl: null, isLoading: false })
          }
          return
        }

        // Fast metadata initial state
        const metaName = user.user_metadata?.display_name || null
        const rawMetaAvatar = user.user_metadata?.avatar_url || null
        const cleanMetaAvatar = rawMetaAvatar && !rawMetaAvatar.startsWith("preset:") ? rawMetaAvatar : null

        if (isMounted) {
          setState({
            displayName: metaName,
            avatarUrl: cleanMetaAvatar,
            isLoading: false,
          })
        }

        // Fetch fresh database record
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", user.id)
          .single()

        if (isMounted && profile) {
          const rawDbAvatar = profile.avatar_url || cleanMetaAvatar
          const cleanAvatar = rawDbAvatar && !rawDbAvatar.startsWith("preset:") ? rawDbAvatar : null

          setState({
            displayName: profile.display_name || metaName,
            avatarUrl: cleanAvatar,
            isLoading: false,
          })
        }
      } catch {
        if (isMounted) {
          setState((prev) => ({ ...prev, isLoading: false }))
        }
      }
    }

    fetchProfile()

    // Listen for auth state change
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchProfile()
    })

    // Listen for instant local profile updates
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ avatarUrl?: string; displayName?: string }>
      if (customEvent.detail) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            ...(customEvent.detail.avatarUrl ? { avatarUrl: customEvent.detail.avatarUrl } : {}),
            ...(customEvent.detail.displayName ? { displayName: customEvent.detail.displayName } : {}),
          }))
        }
      } else {
        fetchProfile()
      }
    }

    window.addEventListener("seijun:profile-updated", handleProfileUpdate)

    return () => {
      isMounted = false
      authListener?.subscription.unsubscribe()
      window.removeEventListener("seijun:profile-updated", handleProfileUpdate)
    }
  }, [])

  return state
}
