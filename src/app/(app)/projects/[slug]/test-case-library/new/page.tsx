import { notFound, redirect } from "next/navigation"

import { createTestCase } from "@/app/(app)/projects/[slug]/test-case-library/actions"
import { TestCaseForm } from "@/components/test-cases/test-case-form"
import { canManageTestCases } from "@/lib/permissions"
import { getProjectBySlug } from "@/lib/supabase/get-project"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function NewTestCasePage({
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

  const { data: members } = await supabase
    .from("project_members")
    .select("user_id, profiles!project_members_user_id_fkey(full_name, email)")
    .eq("project_id", project.id)

  const formattedMembers = (members ?? [])
    .filter((m) => m.profiles)
    .map((m) => ({
      id: m.user_id,
      name: m.profiles!.full_name ?? m.profiles!.email,
    }))

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New test case</h1>
        <p className="text-sm text-muted-foreground">Add a reusable test case to {project.name}.</p>
      </div>
      <TestCaseForm
        action={createTestCase.bind(null, project.id, slug)}
        members={formattedMembers}
        submitLabel="Create test case"
      />
    </div>
  )
}
