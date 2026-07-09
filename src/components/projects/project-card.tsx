import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Database } from "@/types/database.types"

type Project = Database["public"]["Tables"]["projects"]["Row"] & {
  project_members: { user_id: string }[]
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.slug}`}>
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="truncate">{project.name}</CardTitle>
            {project.status === "archived" && <Badge variant="secondary">Archived</Badge>}
          </div>
          <CardDescription className="line-clamp-2">
            {project.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          {project.platform_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.platform_tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <span>
            {project.project_members.length}{" "}
            {project.project_members.length === 1 ? "member" : "members"}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
