"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { ProjectStatus } from "@/types/database.types"

export function ArchiveToggle({
  projectId,
  status,
  action,
}: {
  projectId: string
  status: ProjectStatus
  action: (projectId: string, status: ProjectStatus) => Promise<{ error?: string }>
}) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const isArchived = status === "archived"

  async function handleClick() {
    setIsPending(true)
    const nextStatus = isArchived ? "active" : "archived"
    const result = await action(projectId, nextStatus)
    setIsPending(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success(isArchived ? "Project restored" : "Project archived")
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        This project is currently <span className="font-medium">{status}</span>.
      </p>
      <Button variant={isArchived ? "default" : "outline"} disabled={isPending} onClick={handleClick}>
        {isPending ? "Saving..." : isArchived ? "Restore project" : "Archive project"}
      </Button>
    </div>
  )
}
