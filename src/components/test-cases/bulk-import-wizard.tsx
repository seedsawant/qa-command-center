"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UploadIcon } from "lucide-react"

import type { ParsedFile } from "@/app/(app)/projects/[slug]/test-case-library/actions"
import type { ActionResult, TestCaseInput } from "@/app/(app)/projects/[slug]/test-case-library/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  guessColumnMapping,
  IMPORT_FIELDS,
  normalizeRow,
  type ImportFieldKey,
  type NormalizedRow,
} from "@/lib/bulk-import"

const NO_COLUMN = "__none__"
const PREVIEW_LIMIT = 100

type ImportResult = { imported: number; skippedDuplicates: number }

export function BulkImportWizard({
  projectSlug,
  members,
  existingTitles,
  parseAction,
  importAction,
}: {
  projectSlug: string
  members: { id: string; email: string }[]
  existingTitles: string[]
  parseAction: (formData: FormData) => Promise<ParsedFile | { error: string }>
  importAction: (rows: TestCaseInput[]) => Promise<
    ActionResult & { imported: number; skippedDuplicates: number }
  >
}) {
  const router = useRouter()
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<Partial<Record<ImportFieldKey, number>>>({})
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const memberEmails = useMemo(
    () => new Map(members.map((m) => [m.email.toLowerCase(), m.id])),
    [members]
  )
  const existingTitleSet = useMemo(
    () => new Set(existingTitles.map((t) => t.toLowerCase())),
    [existingTitles]
  )

  const normalizedRows: NormalizedRow[] = useMemo(() => {
    if (!parsed) return []
    // Pre-seed with existing project titles so the first in-file occurrence
    // of a title that already exists in the library is correctly flagged as
    // a duplicate; an in-file repeat only counts from its second occurrence.
    const seenTitles = new Set(existingTitleSet)
    return parsed.rows.map((row, i) => normalizeRow(i + 2, row, mapping, memberEmails, seenTitles))
  }, [parsed, mapping, memberEmails, existingTitleSet])

  const validRows = normalizedRows.filter((r) => r.errors.length === 0 && !r.isDuplicate)
  const invalidRows = normalizedRows.filter((r) => r.errors.length > 0)
  const duplicateRows = normalizedRows.filter((r) => r.isDuplicate && r.errors.length === 0)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setError(null)
    setParsed(null)
    setResult(null)

    const formData = new FormData()
    formData.set("file", file)
    const response = await parseAction(formData)
    setIsParsing(false)

    if ("error" in response) {
      setError(response.error)
      return
    }

    setParsed(response)
    setMapping(guessColumnMapping(response.headers))
  }

  async function handleImport() {
    setIsImporting(true)
    setError(null)

    const rows: TestCaseInput[] = validRows.map((r) => ({
      title: r.title,
      description: r.description,
      preconditions: r.preconditions,
      expectedResult: r.expectedResult,
      priority: r.priority!,
      category: r.category!,
      platform: r.platform,
      tags: r.tags,
      ownerId: r.ownerId,
      estimatedMinutes: r.estimatedMinutes,
    }))

    const response = await importAction(rows)
    setIsImporting(false)

    if (response.error) {
      setError(response.error)
      return
    }

    setResult({ imported: response.imported, skippedDuplicates: response.skippedDuplicates })
    toast.success(`Imported ${response.imported} test case${response.imported === 1 ? "" : "s"}`)
    router.refresh()
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import complete</CardTitle>
          <CardDescription>
            {result.imported} test case{result.imported === 1 ? "" : "s"} imported
            {result.skippedDuplicates > 0 &&
              `, ${result.skippedDuplicates} duplicate${result.skippedDuplicates === 1 ? "" : "s"} skipped`}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href={`/projects/${projectSlug}/test-case-library`} />}>
            Back to library
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Upload file</CardTitle>
          <CardDescription>CSV, XLSX, or XLS. Up to 1000 rows.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} disabled={isParsing} />
          {isParsing && <p className="mt-2 text-sm text-muted-foreground">Parsing...</p>}
          {error && <p className="mt-2 text-sm font-medium text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle>2. Map columns</CardTitle>
            <CardDescription>
              Match each test case field to a column from your file. Title, Priority, and
              Category are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {IMPORT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </label>
                <Select
                  items={{
                    [NO_COLUMN]: "Don't import",
                    ...Object.fromEntries(parsed.headers.map((h, i) => [String(i), h])),
                  }}
                  value={mapping[field.key] !== undefined ? String(mapping[field.key]) : NO_COLUMN}
                  onValueChange={(value) =>
                    setMapping((prev) => ({
                      ...prev,
                      [field.key]: value && value !== NO_COLUMN ? Number(value) : undefined,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_COLUMN}>Don&apos;t import</SelectItem>
                    {parsed.headers.map((header, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle>3. Preview</CardTitle>
            <CardDescription>
              <span className="font-medium text-foreground">{validRows.length}</span> valid ·{" "}
              <span className="font-medium text-foreground">{invalidRows.length}</span> invalid ·{" "}
              <span className="font-medium text-foreground">{duplicateRows.length}</span> duplicate
              {duplicateRows.length === 1 ? "" : "s"} (will be skipped)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {normalizedRows.slice(0, PREVIEW_LIMIT).map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
                      <TableCell className="max-w-64 truncate">{row.title || "—"}</TableCell>
                      <TableCell>{row.priority ?? "—"}</TableCell>
                      <TableCell>{row.category ?? "—"}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <Badge variant="destructive">{row.errors.join("; ")}</Badge>
                        ) : row.isDuplicate ? (
                          <Badge variant="secondary">Duplicate — will skip</Badge>
                        ) : (
                          <Badge variant="outline">Valid</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {normalizedRows.length > PREVIEW_LIMIT && (
              <p className="text-xs text-muted-foreground">
                Showing first {PREVIEW_LIMIT} of {normalizedRows.length} rows.
              </p>
            )}
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button
              onClick={handleImport}
              disabled={isImporting || invalidRows.length > 0 || validRows.length === 0}
            >
              {isImporting ? (
                "Importing..."
              ) : (
                <>
                  <UploadIcon />
                  Import {validRows.length} test case{validRows.length === 1 ? "" : "s"}
                </>
              )}
            </Button>
            {invalidRows.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Fix the {invalidRows.length} invalid row{invalidRows.length === 1 ? "" : "s"} above
                (remap a column or correct the file and re-upload) before importing.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
