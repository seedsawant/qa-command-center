import { notFound, redirect } from "next/navigation"

import { bulkImportTestCases, parseImportFile } from "@/app/(app)/projects/[slug]/test-case-library/actions"
import { BulkImportWizard } from "@/components/test-cases/bulk-import-wizard"
import { canManageTestCases } from "@/lib/permissions"
import { getProjectBySlug } from "@/lib/supabase/get-project"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function BulkImportPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { supabase, profile } = await requireProfile()
  const project = await getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  if (!canManageTestCases(profile.role)) {
    redirect(`/projects/${slug}/test-case-library`)
  }

  const [{ data: members }, { data: testCases }] = await Promise.all([
    supabase
      .from("project_members")
      .select("user_id, profiles!project_members_user_id_fkey(email)")
      .eq("project_id", project.id),
    supabase.from("test_cases").select("title").eq("project_id", project.id),
  ])

  const formattedMembers = (members ?? [])
    .filter((m) => m.profiles)
    .map((m) => ({ id: m.user_id, email: m.profiles!.email }))

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk import test cases</h1>
        <p className="text-sm text-muted-foreground">
          Import test cases into {project.name} from a CSV or Excel file.
        </p>
      </div>
      <BulkImportWizard
        projectSlug={slug}
        members={formattedMembers}
        existingTitles={(testCases ?? []).map((t) => t.title)}
        parseAction={parseImportFile}
        importAction={bulkImportTestCases.bind(null, project.id, slug)}
      />
    </div>
  )
}
