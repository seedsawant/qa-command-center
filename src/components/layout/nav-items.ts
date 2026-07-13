import { FolderKanban, LayoutDashboard, Settings, Users } from "lucide-react"

import type { NavItem } from "@/components/layout/nav-item-types"

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { title: "Projects", href: "/projects", icon: FolderKanban, enabled: true },
  { title: "Users", href: "/users", icon: Users, enabled: true, minRoles: ["producer"] },
  { title: "Settings", href: "/settings", icon: Settings, enabled: true },
]
