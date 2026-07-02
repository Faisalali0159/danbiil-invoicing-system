"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber } from "./utils"

export async function updateCompanySettings(data: {
  id?: string
  company_name: string
  tax_number?: string
  address?: string
  phone?: string
  email?: string
  currency?: string
}) {
  const supabase = await createClient()

  if (data.id) {
    const { error } = await supabase
      .from("company_settings")
      .update({
        company_name: data.company_name,
        tax_number: data.tax_number || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        currency: data.currency || "USD",
      })
      .eq("id", data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from("company_settings").insert({
      company_name: data.company_name,
      tax_number: data.tax_number || null,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      currency: data.currency || "USD",
    })
    if (error) return { error: error.message }
  }

  revalidateModule("/settings")
  return { success: true }
}

export async function updateTaxSettings(data: {
  id?: string
  tax_name: string
  percentage: number
  active: boolean
}) {
  const supabase = await createClient()

  if (data.id) {
    const { error } = await supabase
      .from("tax_settings")
      .update({
        tax_name: data.tax_name,
        percentage: parseNumber(data.percentage),
        active: data.active,
      })
      .eq("id", data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from("tax_settings").insert({
      tax_name: data.tax_name,
      percentage: parseNumber(data.percentage),
      active: data.active,
    })
    if (error) return { error: error.message }
  }

  revalidateModule("/settings")
  revalidateModule("/invoices")
  return { success: true }
}
