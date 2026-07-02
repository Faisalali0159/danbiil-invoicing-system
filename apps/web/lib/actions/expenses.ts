"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber, todayISO } from "./utils"

export async function createExpense(data: {
  category: string
  description?: string
  amount: number
  date?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("expenses").insert({
    category: data.category,
    description: data.description || null,
    amount: parseNumber(data.amount),
    date: data.date || todayISO(),
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }
  revalidateModule("/expenses")
  revalidateModule("/")
  revalidateModule("/reports")
  return { success: true }
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("expenses").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/expenses")
  revalidateModule("/")
  return { success: true }
}
