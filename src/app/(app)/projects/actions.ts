"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { canCreateProject, canEditProjectSettings, canManageMembers } from "@/lib/permissions"
import { slugify } from "@/lib/slugify"
import { requireProfile } from "@/lib/supabase/require-profile"

const projectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  description: z.string().max(2000).optional(),
  platformTags: z.array(z.string()).max(10).optional(),
})

export type ProjectInput = z.infer<typeof projectSchema>
export type ActionResult = { error?: string }

export async function createProject(input: ProjectInput): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile()

  if (!canCreateProject(profile.role)) {
    return { error: "Only producers can create projects." }
  }

  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const slug = slugify(parsed.data.name)
  if (!slug) {
    return { error: "Name must contain at least one letter or number." }
  }

  // Deliberately not chaining .select().single() here: Postgres requires an
  // INSERT ... RETURNING row to also satisfy the table's SELECT policy, but
  // membership (which projects_select_member depends on) is only granted by
  // the on_project_created trigger's side effect — that isn't visible in
  // time for the RETURNING check, so it fails with 42501. We already have
  // the slug locally, so there's nothing we need back from the insert.
  const { error } = await supabase.from("projects").insert({
    name: parsed.data.name,
    slug,
    description: parsed.data.description ?? null,
    platform_tags: parsed.data.platformTags ?? [],
    created_by: profile.id,
  })

  if (error) {
    if (error.code === "23505") {
      return { error: "A project with this name already exists." }
    }
    return { error: error.message }
  }

  revalidatePath("/projects")
  revalidatePath("/dashboard")
  redirect(`/projects/${slug}`)
}

export async function updateProject(
  projectId: string,
  input: ProjectInput
): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile()

  if (!canEditProjectSettings(profile.role)) {
    return { error: "Only producers can edit project settings." }
  }

  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      platform_tags: parsed.data.platformTags ?? [],
    })
    .eq("id", projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/projects")
  return {}
}

export async function setProjectStatus(
  projectId: string,
  status: "active" | "archived"
): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile()

  if (!canEditProjectSettings(profile.role)) {
    return { error: "Only producers can archive projects." }
  }

  const { error } = await supabase.from("projects").update({ status }).eq("id", projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/projects")
  revalidatePath("/dashboard")
  return {}
}

export async function addMember(projectId: string, email: string): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile()

  if (!canManageMembers(profile.role)) {
    return { error: "Only producers can manage project members." }
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle()

  if (!targetProfile) {
    return { error: "No account found with that email. Invite them from Users first." }
  }

  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    user_id: targetProfile.id,
    added_by: profile.id,
  })

  if (error) {
    if (error.code === "23505") {
      return { error: "That person is already a member of this project." }
    }
    return { error: error.message }
  }

  revalidatePath(`/projects`)
  return {}
}

export async function removeMember(projectId: string, userId: string): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile()

  if (!canManageMembers(profile.role)) {
    return { error: "Only producers can manage project members." }
  }

  const { data: project } = await supabase
    .from("projects")
    .select("created_by")
    .eq("id", projectId)
    .single()

  if (project?.created_by === userId) {
    return { error: "The project creator can't be removed." }
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects`)
  return {}
}
