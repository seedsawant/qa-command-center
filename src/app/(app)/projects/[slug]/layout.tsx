import { notFound } from "next/navigation"

import { ProjectSidebar } from "@/components/layout/project-sidebar"
import { Topbar } from "@/components/layout/topbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getProjectBySlug } from "@/lib/supabase/get-project"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { profile } = await requireProfile()
  const project = await getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  return (
    <SidebarProvider>
      <ProjectSidebar slug={slug} projectName={project.name} role={profile.role} />
      <SidebarInset>
        <Topbar profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
