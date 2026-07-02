"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber, todayISO } from "./utils"
import { generateInvoiceNumber } from "@/lib/utils/finance"

type PurchaseLine = {
  product_id: string
  quantity: number
  cost_price: number
}

export async function createPurchase(data: {
  supplier_id: string
  invoice_number?: string
  purchase_date?: string
  paid_amount?: number
  items: PurchaseLine[]
}) {
  const supabase = await createClient()

  if (!data.items.length) return { error: "Add at least one product" }

  const { data: existing } = await supabase
    .from("purchases")
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1)

  const lastNum = existing?.[0]?.invoice_number
  const seq = lastNum ? parseInt(lastNum.split("-").pop() || "0", 10) + 1 : 1
  const invoiceNumber =
    data.invoice_number || generateInvoiceNumber("PUR", seq)

  const totalAmount = data.items.reduce(
    (sum, item) => sum + item.quantity * item.cost_price,
    0
  )
  const paidAmount = parseNumber(data.paid_amount)
  const remaining = totalAmount - paidAmount

  let status: "paid" | "partial" | "unpaid" = "unpaid"
  if (paidAmount >= totalAmount) status = "paid"
  else if (paidAmount > 0) status = "partial"

  const {
    data: { user },
  } = await supabase.auth.getUser()

  for (const item of data.items) {
    const { data: product } = await supabase
      .from("products")
      .select("id, supplier_id, name")
      .eq("id", item.product_id)
      .single()
    if (!product) {
      return { error: "Selected product was not found." }
    }
    if (product.supplier_id && product.supplier_id !== data.supplier_id) {
      return {
        error: `Product ${product.name} belongs to a different supplier.`,
      }
    }
    if (!product.supplier_id) {
      await supabase
        .from("products")
        .update({ supplier_id: data.supplier_id })
        .eq("id", item.product_id)
    }
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      supplier_id: data.supplier_id,
      invoice_number: invoiceNumber,
      purchase_date: data.purchase_date || todayISO(),
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining_balance: remaining,
      status,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (purchaseError) return { error: purchaseError.message }

  const purchaseItems = data.items.map((item) => ({
    purchase_id: purchase.id,
    product_id: item.product_id,
    quantity: item.quantity,
    cost_price: item.cost_price,
    total: item.quantity * item.cost_price,
  }))

  const { error: itemsError } = await supabase
    .from("purchase_items")
    .insert(purchaseItems)
  if (itemsError) return { error: itemsError.message }

  for (const item of data.items) {
    const { data: product } = await supabase
      .from("products")
      .select("quantity, purchase_price")
      .eq("id", item.product_id)
      .single()
    await supabase
      .from("products")
      .update({
        quantity: (product?.quantity ?? 0) + item.quantity,
        purchase_price: item.cost_price,
      })
      .eq("id", item.product_id)
  }

  if (remaining > 0) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("current_balance")
      .eq("id", data.supplier_id)
      .single()
    await supabase
      .from("suppliers")
      .update({
        current_balance: parseNumber(supplier?.current_balance) + remaining,
      })
      .eq("id", data.supplier_id)
  }

  if (paidAmount > 0) {
    const { error: paymentError } = await supabase.from("payments").insert({
      payment_type: "supplier_payment",
      supplier_id: data.supplier_id,
      purchase_id: purchase.id,
      amount: paidAmount,
      payment_date: data.purchase_date || todayISO(),
      notes: "Auto payment from purchase form",
      created_by: user?.id ?? null,
    })
    if (paymentError) return { error: paymentError.message }
  }

  revalidateModule("/purchases")
  revalidateModule("/suppliers")
  revalidateModule("/products")
  revalidateModule("/payments")
  revalidateModule("/")
  revalidateModule("/reports")
  return { success: true, id: purchase.id }
}

export async function deletePurchase(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("purchases").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/purchases")
  return { success: true }
}
