import { notFound } from "next/navigation"

import {
  logTestRun,
  restoreTestCaseVersion,
  setTestCaseStatus,
  updateTestCase,
} from "@/app/(app)/projects/[slug]/test-case-library/actions"
import { ArchiveToggle } from "@/components/shared/archive-toggle"
import { TestCaseForm } from "@/components/test-cases/test-case-form"
import { TestRunLog } from "@/components/test-cases/test-run-log"
import { VersionHistory } from "@/components/test-cases/version-history"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { canLogTestResults, canManageTestCases } from "@/lib/permissions"
import { formatCaseNumber } from "@/lib/test-cases"
import { getProjectBySlug } from "@/lib/supabase/get-project"
import { requireProfile } from "@/lib/supabase/require-profile"

export default async function TestCaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; testCaseId: string }>
}) {
  const { slug, testCaseId } = await params
  const { supabase, profile } = await requireProfile()
  const project = await getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  const { data: testCase } = await supabase
    .from("test_cases")
    .select("*")
    .eq("id", testCaseId)
    .single()

  if (!testCase) {
    notFound()
  }

  const [{ data: members }, { data: versions }, { data: runs }] = await Promise.all([
    supabase
      .from("project_members")
      .select("user_id, profiles!project_members_user_id_fkey(full_name, email)")
      .eq("project_id", project.id),
    supabase
      .from("test_case_versions")
      .select("*, profiles!test_case_versions_changed_by_fkey(full_name, email)")
      .eq("test_case_id", testCaseId)
      .order("version_number", { ascending: false }),
    supabase
      .from("test_case_runs")
      .select("*, profiles!test_case_runs_tested_by_fkey(full_name, email)")
      .eq("test_case_id", testCaseId)
      .order("tested_at", { ascending: false }),
  ])

  const formattedMembers = (members ?? [])
    .filter((m) => m.profiles)
    .map((m) => ({
      id: m.user_id,
      name: m.profiles!.full_name ?? m.profiles!.email,
    }))

  const formattedVersions = (versions ?? []).map((v) => ({
    ...v,
    changedByName: v.profiles?.full_name ?? v.profiles?.email ?? "Unknown",
  }))

  const formattedRuns = (runs ?? []).map((r) => ({
    ...r,
    testedByName: r.profiles?.full_name ?? r.profiles?.email ?? "Unknown",
  }))

  const canManage = canManageTestCases(profile.role)
  const canLog = canLogTestResults(profile.role)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-muted-foreground">
          {formatCaseNumber(testCase.case_number)}
        </span>
        {testCase.status === "archived" && <Badge variant="secondary">Archived</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TestCaseForm
            key={testCase.updated_at}
            action={updateTestCase.bind(null, testCaseId, slug)}
            members={formattedMembers}
            readOnly={!canManage}
            submitLabel="Save changes"
            defaultValues={{
              title: testCase.title,
              description: testCase.description ?? "",
              preconditions: testCase.preconditions ?? "",
              expectedResult: testCase.expected_result ?? "",
              priority: testCase.priority,
              category: testCase.category,
              platform: testCase.platform,
              tagsInput: testCase.tags.join(", "),
              ownerId: testCase.owner_id,
              estimatedMinutes: testCase.estimated_minutes ? String(testCase.estimated_minutes) : "",
            }}
          />
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <ArchiveToggle
              status={testCase.status}
              action={setTestCaseStatus.bind(null, testCaseId, slug)}
              label="test case"
            />
          </CardContent>
        </Card>
      )}

      <TestRunLog
        runs={formattedRuns}
        canLog={canLog}
        logAction={logTestRun.bind(null, testCaseId, slug)}
      />

      <VersionHistory
        versions={formattedVersions}
        canManage={canManage}
        onRestore={restoreTestCaseVersion.bind(null, testCaseId, slug)}
      />
    </div>
  )
}
