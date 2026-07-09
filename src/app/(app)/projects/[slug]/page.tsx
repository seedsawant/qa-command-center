import Link from "next/link"
import { notFound } from "next/navigation"
import { SettingsIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { canEditProjectSettings, ROLE_LABELS } from "@/lib/permissions"
import { requireProfile } from "@/lib/supabase/require-profile"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { supabase, profile } = await requireProfile()

  const { data: project } = await supabase.from("projects").select("*").eq("slug", slug).single()

  if (!project) {
    notFound()
  }

  const { data: members } = await supabase
    .from("project_members")
    .select("id, user_id, profiles!project_members_user_id_fkey(full_name, email, role)")
    .eq("project_id", project.id)
    .order("created_at")

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {project.status === "archived" && <Badge variant="secondary">Archived</Badge>}
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
          {project.platform_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {project.platform_tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {canEditProjectSettings(profile.role) && (
          <Button variant="outline" render={<Link href={`/projects/${project.slug}/settings`} />}>
            <SettingsIcon />
            Settings
          </Button>
        )}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Members ({members?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members?.map((member) => {
            const memberProfile = member.profiles
            if (!memberProfile) return null
            const name = memberProfile.full_name ?? memberProfile.email
            return (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar size="sm">
                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{memberProfile.email}</p>
                  </div>
                </div>
                <Badge variant="secondary">{ROLE_LABELS[memberProfile.role]}</Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
