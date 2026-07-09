import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserMenu } from "@/components/layout/user-menu"
import type { Database } from "@/types/database.types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export function Topbar({ profile }: { profile: Profile }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
      </div>
      <UserMenu profile={profile} />
    </header>
  )
}
