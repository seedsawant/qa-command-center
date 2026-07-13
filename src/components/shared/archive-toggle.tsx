"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function ArchiveToggle({
  status,
  action,
  label = "item",
}: {
  status: "active" | "archived"
  action: (status: "active" | "archived") => Promise<{ error?: string }>
  label?: string
}) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const isArchived = status === "archived"

  async function handleClick() {
    setIsPending(true)
    const nextStatus = isArchived ? "active" : "archived"
    const result = await action(nextStatus)
    setIsPending(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success(capitalize(`${label} ${isArchived ? "restored" : "archived"}`))
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        This {label} is currently <span className="font-medium">{status}</span>.
      </p>
      <Button variant={isArchived ? "default" : "outline"} disabled={isPending} onClick={handleClick}>
        {isPending ? "Saving..." : capitalize(`${isArchived ? "restore" : "archive"} ${label}`)}
      </Button>
    </div>
  )
}
