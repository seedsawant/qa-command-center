import Link from "next/link"
import { notFound } from "next/navigation"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { TestCaseTable } from "@/components/test-cases/test-case-table"
import { canManageTestCases } from "@/lib/permissions"
import { getProjectBySlug } from "@/lib/supabase/get-project"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function TestCaseLibraryPage({
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

  const { data: testCases } = await supabase
    .from("test_cases")
    .select("*, profiles!test_cases_owner_id_fkey(full_name, email)")
    .eq("project_id", project.id)
    .order("case_number", { ascending: true })

  const canManage = canManageTestCases(profile.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Test Case Library</h1>
          <p className="text-sm text-muted-foreground">
            Reusable test cases for {project.name}.
          </p>
        </div>
        {canManage && (
          <Button render={<Link href={`/projects/${slug}/test-case-library/new`} />}>
            <PlusIcon />
            New test case
          </Button>
        )}
      </div>

      {!testCases?.length ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <CardTitle>No test cases yet</CardTitle>
          <CardDescription>
            {canManage
              ? "Create your first test case to start building the library."
              : "No test cases have been added to this project yet."}
          </CardDescription>
          {canManage && (
            <Button render={<Link href={`/projects/${slug}/test-case-library/new`} />}>
              <PlusIcon />
              New test case
            </Button>
          )}
        </Card>
      ) : (
        <TestCaseTable testCases={testCases} projectSlug={slug} />
      )}
    </div>
  )
}
