"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { canInviteUsers } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireProfile } from "@/lib/supabase/require-profile"
import type { AppRole } from "@/types/database.types"

const ROLE_VALUES: [AppRole, ...AppRole[]] = ["producer", "qa_lead", "tester", "viewer"]

const createUserSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  fullName: z.string().max(120).optional(),
  role: z.enum(ROLE_VALUES),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type ActionResult = { error?: string }

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  const { profile } = await requireProfile()

  if (!canInviteUsers(profile.role)) {
    return { error: "Only producers can add users." }
  }

  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const admin = createAdminClient()

  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      role: parsed.data.role,
      full_name: parsed.data.fullName || undefined,
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/users")
  return {}
}

export async function updateUserRole(userId: string, role: AppRole): Promise<ActionResult> {
  const { profile } = await requireProfile()

  if (!canInviteUsers(profile.role)) {
    return { error: "Only producers can change roles." }
  }

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/users")
  return {}
}

export async function setUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  const { profile } = await requireProfile()

  if (!canInviteUsers(profile.role)) {
    return { error: "Only producers can change account status." }
  }

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update({ is_active: isActive }).eq("id", userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/users")
  return {}
}
