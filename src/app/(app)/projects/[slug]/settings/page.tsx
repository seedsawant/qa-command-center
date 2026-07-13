import { notFound, redirect } from "next/navigation"

import { addMember, removeMember, setProjectStatus, updateProject } from "@/app/(app)/projects/actions"
import { ArchiveToggle } from "@/components/shared/archive-toggle"
import { MemberManager } from "@/components/projects/member-manager"
import { ProjectForm } from "@/components/projects/project-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { canEditProjectSettings } from "@/lib/permissions"
import { getProjectBySlug } from "@/lib/supabase/get-project"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { supabase, profile } = await requireProfile()

  if (!canEditProjectSettings(profile.role)) {
    redirect(`/projects/${slug}`)
  }

  const project = await getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  const { data: members } = await supabase
    .from("project_members")
    .select("id, user_id, profiles!project_members_user_id_fkey(full_name, email, role)")
    .eq("project_id", project.id)
    .order("created_at")

  const formattedMembers = (members ?? [])
    .filter((member) => member.profiles)
    .map((member) => ({
      id: member.id,
      userId: member.user_id,
      name: member.profiles!.full_name ?? member.profiles!.email,
      email: member.profiles!.email,
      role: member.profiles!.role,
    }))

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{project.name} settings</h1>
        <p className="text-sm text-muted-foreground">
          Producer-only. Update project details, membership, and status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm
            action={updateProject.bind(null, project.id)}
            defaultValues={{
              name: project.name,
              description: project.description ?? "",
              platformTags: project.platform_tags.join(", "),
            }}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Only members can see and work in this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <MemberManager
            projectId={project.id}
            members={formattedMembers}
            creatorUserId={project.created_by}
            onAdd={addMember}
            onRemove={removeMember}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>
            Archiving hides this project from the active dashboard without deleting any data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <ArchiveToggle
            status={project.status}
            action={setProjectStatus.bind(null, project.id)}
            label="project"
          />
        </CardContent>
      </Card>
    </div>
  )
}
