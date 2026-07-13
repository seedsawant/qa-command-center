"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { getProjectNavItems } from "@/components/layout/project-nav-items"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { AppRole } from "@/types/database.types"

export function ProjectSidebar({
  slug,
  projectName,
  role,
}: {
  slug: string
  projectName: string
  role: AppRole
}) {
  const pathname = usePathname()
  const overviewHref = `/projects/${slug}`
  const items = getProjectNavItems(slug).filter(
    (item) => !item.minRoles || item.minRoles.includes(role)
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/projects"
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:hidden"
        >
          <ArrowLeftIcon className="size-3.5" />
          Projects
        </Link>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            {projectName.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {projectName}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                if (!item.enabled) {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        disabled
                        tooltip={`${item.title} — coming in Phase ${item.phase}`}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge>P{item.phase}</SidebarMenuBadge>
                    </SidebarMenuItem>
                  )
                }

                const isActive =
                  item.href === overviewHref
                    ? pathname === overviewHref
                    : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
