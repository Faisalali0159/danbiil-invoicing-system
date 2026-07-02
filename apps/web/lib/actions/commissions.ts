"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber, todayISO } from "./utils"
import { calculateCommission } from "@/lib/utils/finance"

export async function createCommission(data: {
  employee_id: string
  invoice_id: string
  percentage: number
}) {
  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from("invoices")
    .select("total_amount")
    .eq("id", data.invoice_id)
    .single()
  if (!invoice) return { error: "Invoice not found" }

  const amount = calculateCommission(
    parseNumber(invoice.total_amount),
    parseNumber(data.percentage)
  )

  const { error } = await supabase.from("commissions").insert({
    employee_id: data.employee_id,
    invoice_id: data.invoice_id,
    percentage: parseNumber(data.percentage),
    amount,
    status: "pending",
    date: todayISO(),
  })
  if (error) return { error: error.message }
  revalidateModule("/commissions")
  return { success: true }
}

export async function updateCommissionStatus(
  id: string,
  status: "pending" | "paid" | "cancelled"
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("commissions")
    .update({ status })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/commissions")
  return { success: true }
}

export async function deleteCommission(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("commissions").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/commissions")
  return { success: true }
}
