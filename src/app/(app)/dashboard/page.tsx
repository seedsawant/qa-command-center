import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { ProjectCard } from "@/components/projects/project-card"
import { canCreateProject } from "@/lib/permissions"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile()

  const { data: projects } = await supabase
    .from("projects")
    .select("*, project_members(user_id)")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  const canCreate = canCreateProject(profile.role)
  const firstName = (profile.full_name ?? profile.email).split(" ")[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {firstName}</h1>
          <p className="text-sm text-muted-foreground">
            Testing progress, pass rates, and release readiness land here starting Phase 4.
          </p>
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
          <CardTitle>No active projects</CardTitle>
          <CardDescription>
            {canCreate
              ? "Create your first project to get started."
              : "You haven't been added to any projects yet — ask a producer to add you."}
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
