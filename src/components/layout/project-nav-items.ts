import {
  BarChart3,
  Blocks,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  Layers,
  ListChecks,
  PlayCircle,
  Rocket,
  Settings,
} from "lucide-react"

import type { NavItem } from "@/components/layout/nav-item-types"

export function getProjectNavItems(slug: string): NavItem[] {
  const base = `/projects/${slug}`

  return [
    { title: "Overview", href: base, icon: LayoutDashboard, enabled: true },
    { title: "Modules", href: `${base}/modules`, icon: Blocks, enabled: false, phase: 2 },
    { title: "Features", href: `${base}/features`, icon: Layers, enabled: false, phase: 2 },
    {
      title: "Test Case Library",
      href: `${base}/test-case-library`,
      icon: ListChecks,
      enabled: true,
    },
    { title: "Builds", href: `${base}/builds`, icon: Rocket, enabled: false, phase: 3 },
    { title: "Test Plans", href: `${base}/test-plans`, icon: ClipboardList, enabled: false, phase: 3 },
    {
      title: "Test Execution",
      href: `${base}/test-execution`,
      icon: PlayCircle,
      enabled: false,
      phase: 3,
    },
    { title: "Reports", href: `${base}/reports`, icon: FileBarChart, enabled: false, phase: 4 },
    { title: "Analytics", href: `${base}/analytics`, icon: BarChart3, enabled: false, phase: 4 },
    {
      title: "Settings",
      href: `${base}/settings`,
      icon: Settings,
      enabled: true,
      minRoles: ["producer"],
    },
  ]
}
