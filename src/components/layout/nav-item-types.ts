import type { LucideIcon } from "lucide-react"

import type { AppRole } from "@/types/database.types"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  /** false = not built yet in the current phase; renders disabled with a "Phase N" badge */
  enabled: boolean
  /** Undefined = visible to every role. Otherwise hidden entirely for roles not listed. */
  minRoles?: AppRole[]
  phase?: number
}
