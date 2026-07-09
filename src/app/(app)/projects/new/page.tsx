import { redirect } from "next/navigation"

import { createProject } from "@/app/(app)/projects/actions"
import { ProjectForm } from "@/components/projects/project-form"
import { canCreateProject } from "@/lib/permissions"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function NewProjectPage() {
  const { profile } = await requireProfile()

  if (!canCreateProject(profile.role)) {
    redirect("/projects")
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New project</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ll automatically become a member once it&apos;s created.
        </p>
      </div>
      <ProjectForm action={createProject} submitLabel="Create project" />
    </div>
  )
}
