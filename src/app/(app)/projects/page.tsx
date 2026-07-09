import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { ProjectCard } from "@/components/projects/project-card"
import { canCreateProject } from "@/lib/permissions"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function ProjectsPage() {
  const { supabase, profile } = await requireProfile()

  const { data: projects } = await supabase
    .from("projects")
    .select("*, project_members(user_id)")
    .order("created_at", { ascending: false })

  const canCreate = canCreateProject(profile.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Projects you&apos;re a member of.</p>
        </div>
        {canCreate && (
          <Button render={<Link href="/projects/new" />}>
            <PlusIcon />
            New project
          </Button>
        )}
      </div>

      {!projects?.length ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <CardTitle>No projects yet</CardTitle>
          <CardDescription>
            {canCreate
              ? "Create your first project to get started."
              : "You haven't been added to any projects yet."}
          </CardDescription>
          {canCreate && (
            <Button render={<Link href="/projects/new" />}>
              <PlusIcon />
              New project
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
