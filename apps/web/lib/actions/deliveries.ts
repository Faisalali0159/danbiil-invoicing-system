"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber, todayISO } from "./utils"

export async function createDelivery(data: {
  invoice_id: string
  driver_name?: string
  vehicle?: string
  cost: number
  status?: "pending" | "in_transit" | "delivered" | "cancelled"
  date?: string
}) {
  const supabase = await createClient()
  const cost = parseNumber(data.cost)

  const { error } = await supabase.from("deliveries").insert({
    invoice_id: data.invoice_id,
    driver_name: data.driver_name || null,
    vehicle: data.vehicle || null,
    cost,
    status: data.status || "pending",
    date: data.date || todayISO(),
  })
  if (error) return { error: error.message }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("delivery_cost, total_amount, paid_amount, remaining_balance")
    .eq("id", data.invoice_id)
    .single()
  if (invoice) {
    const newDeliveryCost = parseNumber(invoice.delivery_cost) + cost
    const newTotal =
      parseNumber(invoice.total_amount) -
      parseNumber(invoice.delivery_cost) +
      newDeliveryCost
    const paid = parseNumber(invoice.paid_amount)
    await supabase
      .from("invoices")
      .update({
        delivery_cost: newDeliveryCost,
        total_amount: newTotal,
        remaining_balance: Math.max(0, newTotal - paid),
      })
      .eq("id", data.invoice_id)
  }

  revalidateModule("/deliveries")
  revalidateModule("/invoices")
  revalidateModule("/")
  return { success: true }
}

export async function updateDeliveryStatus(
  id: string,
  status: "pending" | "in_transit" | "delivered" | "cancelled"
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("deliveries")
    .update({ status })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/deliveries")
  return { success: true }
}

export async function deleteDelivery(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("deliveries").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/deliveries")
  return { success: true }
}
