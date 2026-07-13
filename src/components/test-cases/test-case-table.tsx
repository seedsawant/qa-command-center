"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDownIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
  CATEGORIES,
  CATEGORY_LABELS,
  formatCaseNumber,
  PLATFORM_LABELS,
  PLATFORMS,
  PRIORITIES,
  PRIORITY_LABELS,
} from "@/lib/test-cases"
import type { Database } from "@/types/database.types"

type TestCaseRow = Database["public"]["Tables"]["test_cases"]["Row"] & {
  profiles: { full_name: string | null; email: string } | null
}

const PRIORITY_BADGE_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
}

const columnHelper = createColumnHelper<TestCaseRow>()

function SortButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {label}
      <ArrowUpDownIcon className="size-3" />
    </button>
  )
}

export function TestCaseTable({
  testCases,
  projectSlug,
}: {
  testCases: TestCaseRow[]
  projectSlug: string
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "caseNumber", desc: false }])
  const [globalFilter, setGlobalFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [platformFilter, setPlatformFilter] = useState<string>("all")

  const columns = useMemo(
    () => [
      columnHelper.accessor("case_number", {
        id: "caseNumber",
        header: ({ column }) => (
          <SortButton label="ID" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
        ),
        cell: (info) => (
          <Link
            href={`/projects/${projectSlug}/test-case-library/${info.row.original.id}`}
            className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {formatCaseNumber(info.getValue())}
          </Link>
        ),
      }),
      columnHelper.accessor("title", {
        header: ({ column }) => (
          <SortButton label="Title" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
        ),
        cell: (info) => (
          <Link
            href={`/projects/${projectSlug}/test-case-library/${info.row.original.id}`}
            className="font-medium hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("priority", {
        header: "Priority",
        cell: (info) => {
          const value = info.getValue()
          return <Badge variant={PRIORITY_BADGE_VARIANT[value]}>{PRIORITY_LABELS[value]}</Badge>
        },
        filterFn: (row, columnId, filterValue) =>
          row.getValue(columnId) === filterValue,
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => <Badge variant="outline">{CATEGORY_LABELS[info.getValue()]}</Badge>,
        filterFn: (row, columnId, filterValue) =>
          row.getValue(columnId) === filterValue,
      }),
      columnHelper.accessor("platform", {
        header: "Platform",
        cell: (info) => {
          const value = info.getValue()
          return value ? <Badge variant="outline">{PLATFORM_LABELS[value]}</Badge> : "—"
        },
        filterFn: (row, columnId, filterValue) =>
          row.getValue(columnId) === filterValue,
      }),
      columnHelper.display({
        id: "owner",
        header: "Owner",
        cell: (info) => {
          const owner = info.row.original.profiles
          return owner ? (
            <span className="text-sm">{owner.full_name ?? owner.email}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          )
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) =>
          info.getValue() === "archived" ? <Badge variant="secondary">Archived</Badge> : null,
      }),
      columnHelper.accessor("updated_at", {
        header: ({ column }) => (
          <SortButton
            label="Updated"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
      }),
    ],
    [projectSlug]
  )

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = []
    if (priorityFilter !== "all") filters.push({ id: "priority", value: priorityFilter })
    if (categoryFilter !== "all") filters.push({ id: "category", value: categoryFilter })
    if (platformFilter !== "all") filters.push({ id: "platform", value: platformFilter })
    return filters
  }, [priorityFilter, categoryFilter, platformFilter])

  const table = useReactTable({
    data: testCases,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search test cases..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <Select
          items={{ all: "All priorities", ...PRIORITY_LABELS }}
          value={priorityFilter}
          onValueChange={(value) => setPriorityFilter(value ?? "all")}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={{ all: "All categories", ...CATEGORY_LABELS }}
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value ?? "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={{ all: "All platforms", ...PLATFORM_LABELS }}
          value={platformFilter}
          onValueChange={(value) => setPlatformFilter(value ?? "all")}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No test cases match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
