import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export const getProjectBySlug = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data: project } = await supabase.from("projects").select("*").eq("slug", slug).single()
  return project
})
