import * as React from "react"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata = {
  title: "Create Account",
  description: "Create your private Seijun account.",
}

export default function RegisterPage() {
  return <RegisterForm />
}
