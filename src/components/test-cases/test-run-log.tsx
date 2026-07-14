"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2Icon, CircleSlashIcon, HistoryIcon, XCircleIcon } from "lucide-react"

import type {
  ActionResult,
  LogTestRunInput,
} from "@/app/(app)/projects/[slug]/test-case-library/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { computeRunStats, RESULT_LABELS } from "@/lib/test-cases"
import type { TestCaseRunResult } from "@/types/database.types"

type Run = {
  id: string
  result: TestCaseRunResult
  build_label: string
  tested_at: string
  testedByName: string
}

const RESULT_BADGE_VARIANT: Record<TestCaseRunResult, "outline" | "destructive" | "secondary"> = {
  passed: "outline",
  failed: "destructive",
  blocked: "secondary",
}

const RESULT_BUTTONS: { result: TestCaseRunResult; icon: typeof CheckCircle2Icon }[] = [
  { result: "passed", icon: CheckCircle2Icon },
  { result: "failed", icon: XCircleIcon },
  { result: "blocked", icon: CircleSlashIcon },
]

export function TestRunLog({
  runs,
  canLog,
  logAction,
}: {
  runs: Run[]
  canLog: boolean
  logAction: (input: LogTestRunInput) => Promise<ActionResult>
}) {
  const router = useRouter()
  const [buildLabel, setBuildLabel] = useState("")
  const [pending, setPending] = useState<TestCaseRunResult | null>(null)

  const stats = computeRunStats(runs)
  const sorted = [...runs].sort(
    (a, b) => new Date(b.tested_at).getTime() - new Date(a.tested_at).getTime()
  )

  async function handleLog(result: TestCaseRunResult) {
    if (!buildLabel.trim()) {
      toast.error("Enter a build label first")
      return
    }

    setPending(result)
    const response = await logAction({ result, buildLabel: buildLabel.trim() })
    setPending(null)

    if (response.error) {
      toast.error(response.error)
      return
    }

    toast.success(`Logged ${RESULT_LABELS[result].toLowerCase()} for ${buildLabel.trim()}`)
    setBuildLabel("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HistoryIcon className="size-4" />
          Test runs
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {stats.total === 0 ? (
            "Not tested yet"
          ) : (
            <>
              {stats.passed} passed · {stats.failed} failed
              {stats.blocked > 0 && ` · ${stats.blocked} blocked`}
              {stats.passRate !== null && ` — ${stats.passRate}% pass rate`}
            </>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {canLog && (
          <div className="flex flex-wrap items-center gap-2 border-b pb-4">
            <Input
              placeholder="Build label, e.g. v1.2.0"
              value={buildLabel}
              onChange={(e) => setBuildLabel(e.target.value)}
              className="max-w-48"
            />
            {RESULT_BUTTONS.map(({ result, icon: Icon }) => (
              <Button
                key={result}
                type="button"
                variant="outline"
                size="sm"
                disabled={pending !== null}
                onClick={() => handleLog(result)}
              >
                <Icon />
                {pending === result ? "Logging..." : RESULT_LABELS[result]}
              </Button>
            ))}
          </div>
        )}

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs logged yet.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((run) => (
              <div key={run.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant={RESULT_BADGE_VARIANT[run.result]}>
                    {RESULT_LABELS[run.result]}
                  </Badge>
                  <span className="font-medium">{run.build_label}</span>
                  <span className="text-muted-foreground">{run.testedByName}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(run.tested_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
