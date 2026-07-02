"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber } from "./utils"

export async function createSupplier(data: {
  name: string
  phone?: string
  email?: string
  address?: string
  company_name?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("suppliers").insert({
    name: data.name,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    company_name: data.company_name || null,
  })
  if (error) return { error: error.message }
  revalidateModule("/suppliers")
  return { success: true }
}

export async function updateSupplier(
  id: string,
  data: {
    name: string
    phone?: string
    email?: string
    address?: string
    company_name?: string
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      company_name: data.company_name || null,
    })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/suppliers")
  return { success: true }
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("suppliers").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/suppliers")
  return { success: true }
}
