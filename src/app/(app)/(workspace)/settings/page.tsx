import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ROLE_LABELS } from "@/lib/permissions"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function SettingsPage() {
  const { profile } = await requireProfile()

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Project and workspace settings arrive alongside their respective
          phases. For now, here&apos;s your account.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your profile and role in QA Command Center.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{profile.full_name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{profile.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
