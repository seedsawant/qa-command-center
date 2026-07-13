import { redirect } from "next/navigation"

import { CreateUserDialog } from "@/components/users/create-user-dialog"
import { UsersTable } from "@/components/users/users-table"
import { canInviteUsers } from "@/lib/permissions"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function UsersPage() {
  const { supabase, profile } = await requireProfile()

  if (!canInviteUsers(profile.role)) {
    redirect("/dashboard")
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage roles and access across QA Command Center.
          </p>
        </div>
        <CreateUserDialog />
      </div>
      <UsersTable
        users={(users ?? []).map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.full_name,
          role: u.role,
          isActive: u.is_active,
        }))}
        currentUserId={profile.id}
      />
    </div>
  )
}
