import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Blocks,
  ClipboardList,
  FileBarChart,
  FolderKanban,
  LayoutDashboard,
  Layers,
  ListChecks,
  PlayCircle,
  Rocket,
  Settings,
  Users,
} from "lucide-react"

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

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { title: "Projects", href: "/projects", icon: FolderKanban, enabled: true },
  { title: "Builds", href: "/builds", icon: Rocket, enabled: false, phase: 3 },
  { title: "Modules", href: "/modules", icon: Blocks, enabled: false, phase: 2 },
  { title: "Features", href: "/features", icon: Layers, enabled: false, phase: 2 },
  {
    title: "Test Case Library",
    href: "/test-case-library",
    icon: ListChecks,
    enabled: false,
    phase: 2,
  },
  { title: "Test Plans", href: "/test-plans", icon: ClipboardList, enabled: false, phase: 3 },
  { title: "Test Execution", href: "/test-execution", icon: PlayCircle, enabled: false, phase: 3 },
  { title: "Reports", href: "/reports", icon: FileBarChart, enabled: false, phase: 4 },
  { title: "Analytics", href: "/analytics", icon: BarChart3, enabled: false, phase: 4 },
  { title: "Users", href: "/users", icon: Users, enabled: true, minRoles: ["producer"] },
  { title: "Settings", href: "/settings", icon: Settings, enabled: true },
]
