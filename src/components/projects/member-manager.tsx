"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import { UserMinusIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ROLE_LABELS } from "@/lib/permissions"
import type { AppRole } from "@/types/database.types"

type Member = {
  id: string
  userId: string
  name: string
  email: string
  role: AppRole
}

const addMemberSchema = z.object({
  email: z.string().email("Enter a valid email address"),
})

type AddMemberValues = z.infer<typeof addMemberSchema>

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function MemberManager({
  projectId,
  members,
  creatorUserId,
  onAdd,
  onRemove,
}: {
  projectId: string
  members: Member[]
  creatorUserId: string
  onAdd: (projectId: string, email: string) => Promise<{ error?: string }>
  onRemove: (projectId: string, userId: string) => Promise<{ error?: string }>
}) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: AddMemberValues) {
    setFormError(null)
    const result = await onAdd(projectId, values.email)
    if (result?.error) {
      setFormError(result.error)
      return
    }
    toast.success("Member added")
    reset()
    router.refresh()
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId)
    const result = await onRemove(projectId, userId)
    setRemovingId(null)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success("Member removed")
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <Input placeholder="teammate@company.com" {...register("email")} />
              <FieldError errors={[errors.email]} />
            </FieldContent>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add member"}
            </Button>
          </Field>
          {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}
        </FieldGroup>
      </form>

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar size="sm">
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
              {member.userId !== creatorUserId && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={removingId === member.userId}
                  onClick={() => handleRemove(member.userId)}
                >
                  <UserMinusIcon />
                  <span className="sr-only">Remove</span>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
