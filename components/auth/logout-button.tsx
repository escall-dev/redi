"use client"

import * as React from "react"
import { logoutAction } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Clear client session
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // Proceed even if client fails
    }
    // Server action to clear cookies and redirect to /login
    await logoutAction()
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
