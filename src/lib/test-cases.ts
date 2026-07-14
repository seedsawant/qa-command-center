import type {
  TestCaseCategory,
  TestCasePlatform,
  TestCasePriority,
  TestCaseRunResult,
} from "@/types/database.types"

export const PRIORITY_LABELS: Record<TestCasePriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}

export const PRIORITIES: TestCasePriority[] = ["critical", "high", "medium", "low"]

export const CATEGORY_LABELS: Record<TestCaseCategory, string> = {
  smoke: "Smoke",
  regression: "Regression",
  sanity: "Sanity",
  performance: "Performance",
  security: "Security",
  uat: "UAT",
  automation: "Automation",
}

export const CATEGORIES: TestCaseCategory[] = [
  "smoke",
  "regression",
  "sanity",
  "performance",
  "security",
  "uat",
  "automation",
]

export const PLATFORM_LABELS: Record<TestCasePlatform, string> = {
  android: "Android",
  ios: "iOS",
  web: "Web",
  api: "API",
}

export const PLATFORMS: TestCasePlatform[] = ["android", "ios", "web", "api"]

export function formatEstimatedTime(minutes: number | null) {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

export function formatCaseNumber(caseNumber: number) {
  return `TC-${caseNumber}`
}

const DIFF_FIELDS: { key: keyof VersionLike; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "preconditions", label: "Preconditions" },
  { key: "expected_result", label: "Expected result" },
  { key: "priority", label: "Priority" },
  { key: "category", label: "Category" },
  { key: "platform", label: "Platform" },
  { key: "tags", label: "Tags" },
  { key: "owner_id", label: "Owner" },
  { key: "estimated_minutes", label: "Estimated time" },
]

type VersionLike = {
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
}

export function diffTestCaseVersions(older: VersionLike, newer: VersionLike): string[] {
  return DIFF_FIELDS.filter(
    ({ key }) => JSON.stringify(older[key]) !== JSON.stringify(newer[key])
  ).map(({ label }) => label)
}

export const RESULT_LABELS: Record<TestCaseRunResult, string> = {
  passed: "Pass",
  failed: "Fail",
  blocked: "Blocked",
}

export const RESULT_VALUES: TestCaseRunResult[] = ["passed", "failed", "blocked"]

export type RunStats = {
  passed: number
  failed: number
  blocked: number
  total: number
  /** Over passed+failed only — a blocked run is neither a pass nor a fail. */
  passRate: number | null
}

export function computeRunStats(runs: { result: TestCaseRunResult }[]): RunStats {
  const passed = runs.filter((r) => r.result === "passed").length
  const failed = runs.filter((r) => r.result === "failed").length
  const blocked = runs.filter((r) => r.result === "blocked").length
  const decisive = passed + failed

  return {
    passed,
    failed,
    blocked,
    total: runs.length,
    passRate: decisive > 0 ? Math.round((passed / decisive) * 100) : null,
  }
}
