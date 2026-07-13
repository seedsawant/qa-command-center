"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import ExcelJS from "exceljs"
import Papa from "papaparse"
import { z } from "zod"

import { IMPORT_ROW_CAP } from "@/lib/bulk-import"
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

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((t) => t.text).join("")
    if ("text" in value) return String(value.text)
    if ("result" in value) return String(value.result ?? "")
  }
  return String(value)
}

export type ParsedFile = { headers: string[]; rows: string[][] }

export async function parseImportFile(
  formData: FormData
): Promise<ParsedFile | { error: string }> {
  const { profile } = await requireProfile()

  if (!canManageTestCases(profile.role)) {
    return { error: "Only producers and QA leads can import test cases." }
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { error: "No file provided" }
  }

  const name = file.name.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  let allRows: string[][]

  try {
    if (name.endsWith(".csv")) {
      const parsed = Papa.parse<string[]>(buffer.toString("utf-8"), { skipEmptyLines: true })
      if (parsed.errors.length) {
        return { error: parsed.errors[0].message }
      }
      allRows = parsed.data
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const workbook = new ExcelJS.Workbook()
      // exceljs's bundled types predate Node's newer generic Buffer<T>; the
      // runtime value is a perfectly normal Buffer.
      await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        return { error: "No worksheet found in file" }
      }

      allRows = []
      worksheet.eachRow((row) => {
        const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellToString)
        if (values.some((v) => v !== "")) {
          allRows.push(values)
        }
      })
    } else {
      return { error: "Unsupported file type. Upload a .csv, .xlsx, or .xls file." }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to parse file" }
  }

  const [headers, ...rows] = allRows

  if (!headers?.length) {
    return { error: "File is empty" }
  }

  if (rows.length > IMPORT_ROW_CAP) {
    return {
      error: `File has ${rows.length} rows; the limit is ${IMPORT_ROW_CAP} per import. Split it into smaller files.`,
    }
  }

  return { headers, rows }
}

export async function bulkImportTestCases(
  projectId: string,
  projectSlug: string,
  rows: TestCaseInput[]
): Promise<{ imported: number; skippedDuplicates: number; error?: string }> {
  const { supabase, profile } = await requireProfile()

  if (!canManageTestCases(profile.role)) {
    return { imported: 0, skippedDuplicates: 0, error: "Only producers and QA leads can import test cases." }
  }

  if (rows.length === 0) {
    return { imported: 0, skippedDuplicates: 0, error: "No rows to import." }
  }

  if (rows.length > IMPORT_ROW_CAP) {
    return {
      imported: 0,
      skippedDuplicates: 0,
      error: `${rows.length} rows exceeds the ${IMPORT_ROW_CAP} row limit per import.`,
    }
  }

  const parsedRows: TestCaseInput[] = []
  for (const row of rows) {
    const parsed = testCaseSchema.safeParse(row)
    if (!parsed.success) {
      return {
        imported: 0,
        skippedDuplicates: 0,
        error: `Row "${row.title}": ${parsed.error.issues[0]?.message ?? "invalid"}`,
      }
    }
    parsedRows.push(parsed.data)
  }

  // Defensive re-check against current titles (covers a race between two
  // concurrent imports); the client already filtered these out in the
  // common case.
  const { data: existing } = await supabase
    .from("test_cases")
    .select("title")
    .eq("project_id", projectId)

  const existingTitles = new Set((existing ?? []).map((t) => t.title.toLowerCase()))
  const seenTitles = new Set<string>()
  const toInsert: TestCaseInput[] = []
  let skippedDuplicates = 0

  for (const row of parsedRows) {
    const key = row.title.toLowerCase()
    if (existingTitles.has(key) || seenTitles.has(key)) {
      skippedDuplicates += 1
      continue
    }
    seenTitles.add(key)
    toInsert.push(row)
  }

  if (toInsert.length === 0) {
    return { imported: 0, skippedDuplicates }
  }

  const { data: inserted, error } = await supabase
    .from("test_cases")
    .insert(
      toInsert.map((row) => ({
        project_id: projectId,
        title: row.title,
        description: row.description || null,
        preconditions: row.preconditions || null,
        expected_result: row.expectedResult || null,
        priority: row.priority,
        category: row.category,
        platform: row.platform || null,
        tags: row.tags ?? [],
        owner_id: row.ownerId || null,
        estimated_minutes: row.estimatedMinutes || null,
        created_by: profile.id,
      }))
    )
    .select()

  if (error) {
    return { imported: 0, skippedDuplicates, error: error.message }
  }

  await supabase.from("test_case_versions").insert(
    inserted.map((testCase) => ({
      test_case_id: testCase.id,
      version_number: 1,
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
      changed_by: profile.id,
      change_note: "Imported",
    }))
  )

  revalidatePath(`/projects/${projectSlug}/test-case-library`)

  return { imported: inserted.length, skippedDuplicates }
}
