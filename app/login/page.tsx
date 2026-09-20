import * as React from "react"
import { LoginForm } from "@/components/auth/login-form"
import { APP_VERSION } from "@/lib/version"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Sign In",
  description: "Sign in to continue to Seijun private cycle tracking.",
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="text-sm text-muted-foreground text-center">Loading...</div>}>
      <LoginForm version={APP_VERSION} />
    </React.Suspense>
  )
}



