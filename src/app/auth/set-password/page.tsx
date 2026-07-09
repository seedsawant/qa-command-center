import { SetPasswordForm } from "@/components/auth/set-password-form"

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Set your password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a password to finish setting up your account.
          </p>
        </div>
        <SetPasswordForm />
      </div>
    </div>
  )
}
