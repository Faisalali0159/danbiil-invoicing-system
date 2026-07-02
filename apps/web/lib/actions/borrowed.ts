"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber, todayISO } from "./utils"

export async function createBorrowed(data: {
  supplier_id: string
  product_id: string
  quantity: number
  cost: number
  borrow_date?: string
  due_date?: string
  paid_amount?: number
}) {
  const supabase = await createClient()
  const { data: product } = await supabase
    .from("products")
    .select("id, supplier_id")
    .eq("id", data.product_id)
    .single()
  if (!product) return { error: "Selected product was not found." }
  if (product.supplier_id && product.supplier_id !== data.supplier_id) {
    return {
      error: "Selected product belongs to a different supplier. Please choose a matching product.",
    }
  }
  if (!product.supplier_id) {
    await supabase
      .from("products")
      .update({ supplier_id: data.supplier_id })
      .eq("id", data.product_id)
  }

  const paidAmount = parseNumber(data.paid_amount)
  const cost = parseNumber(data.cost)
  let paymentStatus: "paid" | "partial" | "unpaid" = "unpaid"
  if (paidAmount >= cost) paymentStatus = "paid"
  else if (paidAmount > 0) paymentStatus = "partial"

  const { error } = await supabase.from("borrowed_products").insert({
    supplier_id: data.supplier_id,
    product_id: data.product_id,
    quantity: parseNumber(data.quantity),
    cost,
    borrow_date: data.borrow_date || todayISO(),
    due_date: data.due_date || null,
    paid_amount: paidAmount,
    payment_status: paymentStatus,
  })
  if (error) return { error: error.message }

  const { data: stockProduct } = await supabase
    .from("products")
    .select("quantity")
    .eq("id", data.product_id)
    .single()
  await supabase
    .from("products")
    .update({
      quantity: (stockProduct?.quantity ?? 0) + parseNumber(data.quantity),
    })
    .eq("id", data.product_id)

  if (cost - paidAmount > 0) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("current_balance")
      .eq("id", data.supplier_id)
      .single()
    await supabase
      .from("suppliers")
      .update({
        current_balance:
          parseNumber(supplier?.current_balance) + (cost - paidAmount),
      })
      .eq("id", data.supplier_id)
  }

  revalidateModule("/borrowed")
  revalidateModule("/products")
  revalidateModule("/suppliers")
  return { success: true }
}

export async function deleteBorrowed(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("borrowed_products").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/borrowed")
  return { success: true }
}
