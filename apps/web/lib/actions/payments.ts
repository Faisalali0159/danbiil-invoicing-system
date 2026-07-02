"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber, todayISO } from "./utils"

export async function createPayment(data: {
  payment_type: "customer_payment" | "supplier_payment"
  customer_id?: string
  supplier_id?: string
  invoice_id?: string
  purchase_id?: string
  amount: number
  payment_date?: string
  notes?: string
}) {
  const supabase = await createClient()
  const amount = parseNumber(data.amount)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("payments").insert({
    payment_type: data.payment_type,
    customer_id: data.customer_id || null,
    supplier_id: data.supplier_id || null,
    invoice_id: data.invoice_id || null,
    purchase_id: data.purchase_id || null,
    amount,
    payment_date: data.payment_date || todayISO(),
    notes: data.notes || null,
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }

  if (data.payment_type === "customer_payment" && data.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("current_balance")
      .eq("id", data.customer_id)
      .single()
    await supabase
      .from("customers")
      .update({
        current_balance: Math.max(
          0,
          parseNumber(customer?.current_balance) - amount
        ),
      })
      .eq("id", data.customer_id)

    if (data.invoice_id) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("paid_amount, total_amount")
        .eq("id", data.invoice_id)
        .single()
      if (invoice) {
        const newPaid = parseNumber(invoice.paid_amount) + amount
        const total = parseNumber(invoice.total_amount)
        const remaining = total - newPaid
        let paymentStatus: "paid" | "partial" | "unpaid" = "unpaid"
        if (newPaid >= total) paymentStatus = "paid"
        else if (newPaid > 0) paymentStatus = "partial"
        await supabase
          .from("invoices")
          .update({
            paid_amount: newPaid,
            remaining_balance: Math.max(0, remaining),
            payment_status: paymentStatus,
          })
          .eq("id", data.invoice_id)
      }
    }
  }

  if (data.payment_type === "supplier_payment" && data.supplier_id) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("current_balance")
      .eq("id", data.supplier_id)
      .single()
    await supabase
      .from("suppliers")
      .update({
        current_balance: Math.max(
          0,
          parseNumber(supplier?.current_balance) - amount
        ),
      })
      .eq("id", data.supplier_id)

    if (data.purchase_id) {
      const { data: purchase } = await supabase
        .from("purchases")
        .select("paid_amount, total_amount")
        .eq("id", data.purchase_id)
        .single()
      if (purchase) {
        const newPaid = parseNumber(purchase.paid_amount) + amount
        const total = parseNumber(purchase.total_amount)
        const remaining = total - newPaid
        let status: "paid" | "partial" | "unpaid" = "unpaid"
        if (newPaid >= total) status = "paid"
        else if (newPaid > 0) status = "partial"
        await supabase
          .from("purchases")
          .update({
            paid_amount: newPaid,
            remaining_balance: Math.max(0, remaining),
            status,
          })
          .eq("id", data.purchase_id)
      }
    }
  }

  revalidateModule("/payments")
  revalidateModule("/customers")
  revalidateModule("/suppliers")
  revalidateModule("/invoices")
  revalidateModule("/purchases")
  revalidateModule("/")
  return { success: true }
}

export async function deletePayment(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("payments").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/payments")
  return { success: true }
}
