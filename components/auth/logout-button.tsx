"use client"

import * as React from "react"
import { logoutAction } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"

import { useRouter } from "next/navigation"

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logoutAction()
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        return
      }
      // Fallback in case server action failed or session was already invalidated
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        // Ignore client error
      }
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="gap-2 h-10 px-4"
    >
      {isLoggingOut ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>Signing out...</span>
        </>
      ) : (
        <>
          <LogOut className="size-4" />
          <span>Sign Out</span>
        </>
      )}
    </Button>
  )
}
