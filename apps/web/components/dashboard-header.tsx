"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Separator } from "@workspace/ui/components/separator"
import { Button } from "@workspace/ui/components/button"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { getPageMeta } from "@/lib/config/page-meta"

export function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const meta = getPageMeta(pathname)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold">{meta.title}</h1>
        {meta.description && (
          <p className="truncate text-xs text-muted-foreground">
            {meta.description}
          </p>
        )}
      </div>
      <Button variant="ghost" size="icon-sm" onClick={handleLogout} title="Sign out">
        <LogOut />
      </Button>
    </header>
  )
}
