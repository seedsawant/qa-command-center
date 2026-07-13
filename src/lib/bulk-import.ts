import { CATEGORIES, PLATFORMS, PRIORITIES } from "@/lib/test-cases"
import type { TestCaseCategory, TestCasePlatform, TestCasePriority } from "@/types/database.types"

export const IMPORT_ROW_CAP = 1000

export type ImportFieldKey =
  | "title"
  | "description"
  | "preconditions"
  | "expectedResult"
  | "priority"
  | "category"
  | "platform"
  | "tags"
  | "ownerEmail"
  | "estimatedMinutes"

export const IMPORT_FIELDS: { key: ImportFieldKey; label: string; required: boolean }[] = [
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description", required: false },
  { key: "preconditions", label: "Preconditions", required: false },
  { key: "expectedResult", label: "Expected result", required: false },
  { key: "priority", label: "Priority", required: true },
  { key: "category", label: "Category", required: true },
  { key: "platform", label: "Platform", required: false },
  { key: "tags", label: "Tags", required: false },
  { key: "ownerEmail", label: "Owner (email)", required: false },
  { key: "estimatedMinutes", label: "Estimated time", required: false },
]

const HEADER_ALIASES: Record<ImportFieldKey, string[]> = {
  title: ["title", "name", "test case", "test case title"],
  description: ["description", "desc", "summary"],
  preconditions: ["preconditions", "precondition", "pre-conditions", "prerequisites"],
  expectedResult: ["expected result", "expectedresult", "expected", "expected outcome"],
  priority: ["priority", "severity"],
  category: ["category", "type", "test type"],
  platform: ["platform", "os"],
  tags: ["tags", "labels"],
  ownerEmail: ["owner", "assignee", "email", "owner email"],
  estimatedMinutes: ["estimated time", "estimate", "time", "minutes", "estimated minutes"],
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase()
}

export function guessColumnMapping(headers: string[]): Partial<Record<ImportFieldKey, number>> {
  const normalized = headers.map(normalizeHeader)
  const mapping: Partial<Record<ImportFieldKey, number>> = {}

  for (const field of IMPORT_FIELDS) {
    const aliases = HEADER_ALIASES[field.key]
    const index = normalized.findIndex((h) => aliases.includes(h))
    if (index !== -1) {
      mapping[field.key] = index
    }
  }

  return mapping
}

export type NormalizedRow = {
  rowNumber: number
  title: string
  description?: string
  preconditions?: string
  expectedResult?: string
  priority?: TestCasePriority
  category?: TestCaseCategory
  platform?: TestCasePlatform
  tags: string[]
  ownerId?: string
  estimatedMinutes?: number
  errors: string[]
  isDuplicate: boolean
}

function cell(row: string[], mapping: Partial<Record<ImportFieldKey, number>>, key: ImportFieldKey) {
  const index = mapping[key]
  if (index === undefined) return undefined
  const value = row[index]
  return value?.trim() || undefined
}

function matchEnum<T extends string>(value: string | undefined, options: readonly T[]): T | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  return options.find((o) => o === normalized)
}

export function normalizeRow(
  rowNumber: number,
  row: string[],
  mapping: Partial<Record<ImportFieldKey, number>>,
  memberEmails: Map<string, string>,
  seenTitles: Set<string>
): NormalizedRow {
  const errors: string[] = []

  const title = cell(row, mapping, "title")
  if (!title) {
    errors.push("Missing title")
  }

  const priorityRaw = cell(row, mapping, "priority")
  const priority = matchEnum(priorityRaw, PRIORITIES)
  if (priorityRaw && !priority) {
    errors.push(`Unrecognized priority "${priorityRaw}"`)
  } else if (!priorityRaw) {
    errors.push("Missing priority")
  }

  const categoryRaw = cell(row, mapping, "category")
  const category = matchEnum(categoryRaw, CATEGORIES)
  if (categoryRaw && !category) {
    errors.push(`Unrecognized category "${categoryRaw}"`)
  } else if (!categoryRaw) {
    errors.push("Missing category")
  }

  const platformRaw = cell(row, mapping, "platform")
  const platform = matchEnum(platformRaw, PLATFORMS)

  const tagsRaw = cell(row, mapping, "tags")
  const tags = tagsRaw
    ? Array.from(new Set(tagsRaw.split(/[,;]/).map((t) => t.trim()).filter(Boolean)))
    : []

  const ownerEmailRaw = cell(row, mapping, "ownerEmail")
  const ownerId = ownerEmailRaw ? memberEmails.get(ownerEmailRaw.toLowerCase()) : undefined

  const estimatedRaw = cell(row, mapping, "estimatedMinutes")
  const parsedEstimate = estimatedRaw ? Number.parseInt(estimatedRaw, 10) : undefined
  const estimatedMinutes =
    parsedEstimate !== undefined && Number.isFinite(parsedEstimate) && parsedEstimate > 0
      ? parsedEstimate
      : undefined

  const normalizedTitle = title?.toLowerCase()
  const isDuplicate = !!normalizedTitle && seenTitles.has(normalizedTitle)
  if (normalizedTitle && !isDuplicate) {
    seenTitles.add(normalizedTitle)
  }

  return {
    rowNumber,
    title: title ?? "",
    description: cell(row, mapping, "description"),
    preconditions: cell(row, mapping, "preconditions"),
    expectedResult: cell(row, mapping, "expectedResult"),
    priority,
    category,
    platform,
    tags,
    ownerId,
    estimatedMinutes,
    errors,
    isDuplicate,
  }
}
