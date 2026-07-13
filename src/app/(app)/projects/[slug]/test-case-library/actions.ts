"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { canManageTestCases } from "@/lib/permissions"
import { requireProfile } from "@/lib/supabase/require-profile"
import type {
  TestCaseCategory,
  TestCasePlatform,
  TestCasePriority,
} from "@/types/database.types"

const PRIORITY_VALUES: [TestCasePriority, ...TestCasePriority[]] = [
  "critical",
  "high",
  "medium",
  "low",
]
const CATEGORY_VALUES: [TestCaseCategory, ...TestCaseCategory[]] = [
  "smoke",
  "regression",
  "sanity",
  "performance",
  "security",
  "uat",
  "automation",
]
const PLATFORM_VALUES: [TestCasePlatform, ...TestCasePlatform[]] = [
  "android",
  "ios",
  "web",
  "api",
]

const testCaseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().max(5000).optional(),
  preconditions: z.string().max(5000).optional(),
  expectedResult: z.string().max(5000).optional(),
  priority: z.enum(PRIORITY_VALUES),
  category: z.enum(CATEGORY_VALUES),
  platform: z.enum(PLATFORM_VALUES).optional(),
  tags: z.array(z.string()).max(20).optional(),
  ownerId: z.string().uuid().optional(),
  estimatedMinutes: z.number().int().positive().max(10000).optional(),
})

export type TestCaseInput = z.infer<typeof testCaseSchema>
export type ActionResult = { error?: string }

async function insertVersionSnapshot(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  testCaseId: string,
  fields: {
    title: string
    description: string | null
    preconditions: string | null
    expected_result: string | null
    priority: TestCasePriority
    category: TestCaseCategory
    platform: TestCasePlatform | null
    tags: string[]
    owner_id: string | null
    estimated_minutes: number | null
  },
  changedBy: string,
  changeNote: string | null
) {
  const { data: lastVersion } = await supabase
    .from("test_case_versions")
    .select("version_number")
    .eq("test_case_id", testCaseId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase.from("test_case_versions").insert({
    test_case_id: testCaseId,
    version_number: (lastVersion?.version_number ?? 0) + 1,
    ...fields,
    changed_by: changedBy,
    change_note: changeNote,
  })
}

export async function createTestCase(
  projectId: string,
  projectSlug: string,
  input: TestCaseInput
): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile()

  if (!canManageTestCases(profile.role)) {
    return { error: "Only producers and QA leads can create test cases." }
  }

  const parsed = testCaseSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { data: testCase, error } = await supabase
    .from("test_cases")
    .insert({
      project_id: projectId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      preconditions: parsed.data.preconditions || null,
      expected_result: parsed.data.expectedResult || null,
      priority: parsed.data.priority,
      category: parsed.data.category,
      platform: parsed.data.platform || null,
      tags: parsed.data.tags ?? [],
      owner_id: parsed.data.ownerId || null,
      estimated_minutes: parsed.data.estimatedMinutes || null,
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  await insertVersionSnapshot(
    supabase,
    testCase.id,
    {
      title: testCase.title,
      description: testCase.description,
      preconditions: testCase.preconditions,
      expected_result: testCase.expected_result,
      priority: testCase.priority,
      category: testCase.category,
      platform: testCase.platform,
      tags: testCase.tags,
      owner_id: testCase.owner_id,
      estimated_minutes: testCase.estimated_minutes,
    },
    profile.id,
    "Created"
  )

  revalidatePath(`/projects/${projectSlug}/test-case-library`)
  redirect(`/projects/${projectSlug}/test-case-library/${testCase.id}`)
}

export async function updateTestCase(
  testCaseId: string,
  projectSlug: string,
  input: TestCaseInput,
  changeNote: string | null = null
): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile()

  if (!canManageTestCases(profile.role)) {
    return { error: "Only producers and QA leads can edit test cases." }
  }

  const parsed = testCaseSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { data: updated, error } = await supabase
    .from("test_cases")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      preconditions: parsed.data.preconditions || null,
      expected_result: parsed.data.expectedResult || null,
      priority: parsed.data.priority,
      category: parsed.data.category,
      platform: parsed.data.platform || null,
      tags: parsed.data.tags ?? [],
      owner_id: parsed.data.ownerId || null,
      estimated_minutes: parsed.data.estimatedMinutes || null,
    })
    .eq("id", testCaseId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  await insertVersionSnapshot(
    supabase,
    testCaseId,
    {
      title: updated.title,
      description: updated.description,
      preconditions: updated.preconditions,
      expected_result: updated.expected_result,
      priority: updated.priority,
      category: updated.category,
      platform: updated.platform,
      tags: updated.tags,
      owner_id: updated.owner_id,
      estimated_minutes: updated.estimated_minutes,
    },
    profile.id,
    changeNote
  )

  revalidatePath(`/projects/${projectSlug}/test-case-library`)
  revalidatePath(`/projects/${projectSlug}/test-case-library/${testCaseId}`)
  return {}
}

export async function setTestCaseStatus(
  testCaseId: string,
  projectSlug: string,
  status: "active" | "archived"
): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile()

  if (!canManageTestCases(profile.role)) {
    return { error: "Only producers and QA leads can archive test cases." }
  }

  const { error } = await supabase.from("test_cases").update({ status }).eq("id", testCaseId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectSlug}/test-case-library`)
  revalidatePath(`/projects/${projectSlug}/test-case-library/${testCaseId}`)
  return {}
}

export async function restoreTestCaseVersion(
  testCaseId: string,
  projectSlug: string,
  versionId: string
): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile()

  if (!canManageTestCases(profile.role)) {
    return { error: "Only producers and QA leads can restore versions." }
  }

  const { data: version, error: versionError } = await supabase
    .from("test_case_versions")
    .select("*")
    .eq("id", versionId)
    .eq("test_case_id", testCaseId)
    .single()

  if (versionError || !version) {
    return { error: versionError?.message ?? "Version not found" }
  }

  return updateTestCase(
    testCaseId,
    projectSlug,
    {
      title: version.title,
      description: version.description ?? undefined,
      preconditions: version.preconditions ?? undefined,
      expectedResult: version.expected_result ?? undefined,
      priority: version.priority,
      category: version.category,
      platform: version.platform ?? undefined,
      tags: version.tags,
      ownerId: version.owner_id ?? undefined,
      estimatedMinutes: version.estimated_minutes ?? undefined,
    },
    `Restored from version ${version.version_number}`
  )
}
