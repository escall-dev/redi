import * as React from "react"
import { LoginForm } from "@/components/auth/login-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Sign In",
  description: "Sign in to continue to Seijun private cycle tracking.",
}

const APP_VERSION = "0.1.0"

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="text-sm text-muted-foreground text-center">Loading...</div>}>
      <LoginForm version={APP_VERSION} />
    </React.Suspense>
  )
}



