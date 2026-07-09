import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">QA Command Center</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with the account your team invited you with.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
