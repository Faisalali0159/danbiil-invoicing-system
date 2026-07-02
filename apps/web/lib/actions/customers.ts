"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber } from "./utils"

export async function createCustomer(data: {
  name: string
  phone?: string
  address?: string
  company_name?: string
  credit_limit?: number
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("customers").insert({
    name: data.name,
    phone: data.phone || null,
    address: data.address || null,
    company_name: data.company_name || null,
    credit_limit: parseNumber(data.credit_limit),
  })
  if (error) return { error: error.message }
  revalidateModule("/customers")
  return { success: true }
}

export async function updateCustomer(
  id: string,
  data: {
    name: string
    phone?: string
    address?: string
    company_name?: string
    credit_limit?: number
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("customers")
    .update({
      name: data.name,
      phone: data.phone || null,
      address: data.address || null,
      company_name: data.company_name || null,
      credit_limit: parseNumber(data.credit_limit),
    })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/customers")
  return { success: true }
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("customers").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/customers")
  return { success: true }
}
