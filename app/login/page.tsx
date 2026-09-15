import * as React from "react"
import { LoginForm } from "@/components/auth/login-form"

export const metadata = {
  title: "Sign In — Redi",
  description: "Sign in to continue to Redi private cycle tracking.",
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="text-sm text-muted-foreground text-center">Loading...</div>}>
      <LoginForm />
    </React.Suspense>
  )
}
