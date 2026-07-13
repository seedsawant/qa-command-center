"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HistoryIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { diffTestCaseVersions } from "@/lib/test-cases"
import type { ActionResult } from "@/app/(app)/projects/[slug]/test-case-library/actions"
import type { TestCaseCategory, TestCasePlatform, TestCasePriority } from "@/types/database.types"

type Version = {
  id: string
  version_number: number
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
  changed_at: string
  change_note: string | null
  changedByName: string
}

export function VersionHistory({
  versions,
  canManage,
  onRestore,
}: {
  versions: Version[]
  canManage: boolean
  onRestore: (versionId: string) => Promise<ActionResult>
}) {
  const router = useRouter()
  const [restoringId, setRestoringId] = useState<string | null>(null)

  // versions arrive newest-first; walk pairs to diff each against its predecessor
  const sorted = [...versions].sort((a, b) => b.version_number - a.version_number)

  async function handleRestore(versionId: string, versionNumber: number) {
    setRestoringId(versionId)
    const result = await onRestore(versionId)
    setRestoringId(null)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success(`Restored version ${versionNumber}`)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HistoryIcon className="size-4" />
          Version history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((version, index) => {
          const previous = sorted[index + 1]
          const changedFields = previous ? diffTestCaseVersions(previous, version) : []
          const isLatest = index === 0

          return (
            <div
              key={version.id}
              className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Version {version.version_number}</span>
                  {isLatest && <span className="text-xs text-muted-foreground">(current)</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {version.changedByName} · {new Date(version.changed_at).toLocaleString()}
                </p>
                {version.change_note ? (
                  <p className="text-xs text-muted-foreground">{version.change_note}</p>
                ) : changedFields.length ? (
                  <p className="text-xs text-muted-foreground">
                    Changed: {changedFields.join(", ")}
                  </p>
                ) : null}
              </div>
              {canManage && !isLatest && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restoringId === version.id}
                  onClick={() => handleRestore(version.id, version.version_number)}
                >
                  {restoringId === version.id ? "Restoring..." : "Restore"}
                </Button>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
