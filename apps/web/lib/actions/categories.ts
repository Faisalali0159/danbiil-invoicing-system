"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule } from "./utils"

export async function createCategory(name: string, description?: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("categories").insert({
    name,
    description: description || null,
  })
  if (error) return { error: error.message }
  revalidateModule("/products")
  return { success: true }
}
