"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { setUserActive, updateUserRole } from "@/app/(app)/(workspace)/users/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/permissions"
import type { AppRole } from "@/types/database.types"

type UserRow = {
  id: string
  email: string
  fullName: string | null
  role: AppRole
  isActive: boolean
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function handleRoleChange(userId: string, role: AppRole) {
    setPendingId(userId)
    const result = await updateUserRole(userId, role)
    setPendingId(null)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success("Role updated")
    router.refresh()
  }

  async function handleActiveToggle(userId: string, nextActive: boolean) {
    setPendingId(userId)
    const result = await setUserActive(userId, nextActive)
    setPendingId(null)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(nextActive ? "Account reactivated" : "Account deactivated")
    router.refresh()
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const isSelf = user.id === currentUserId
          const name = user.fullName ?? user.email
          return (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                  </Avatar>
                  <span>{name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <Select
                  items={ROLE_LABELS}
                  value={user.role}
                  onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                  disabled={isSelf || pendingId === user.id}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? "secondary" : "outline"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSelf || pendingId === user.id}
                  onClick={() => handleActiveToggle(user.id, !user.isActive)}
                >
                  {user.isActive ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
