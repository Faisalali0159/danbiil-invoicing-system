"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber, todayISO } from "./utils"
import {
  calculateItemProfit,
  calculateVat,
  generateInvoiceNumber,
} from "@/lib/utils/finance"
import type { QuotationStatus } from "@/types/database"

type QuotationLine = {
  product_id: string
  quantity: number
  selling_price: number
  cost_price: number
}

function computeTotals(data: {
  items: QuotationLine[]
  discount?: number
  vat_percentage?: number
  delivery_cost?: number
}) {
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.selling_price,
    0
  )
  const discount = parseNumber(data.discount)
  const afterDiscount = subtotal - discount
  const vatAmount = calculateVat(afterDiscount, parseNumber(data.vat_percentage))
  const deliveryCost = parseNumber(data.delivery_cost)
  const totalAmount = afterDiscount + vatAmount + deliveryCost
  return { subtotal, discount, vatAmount, deliveryCost, totalAmount }
}

function buildItemRows(quotationId: string, items: QuotationLine[]) {
  return items.map((item) => ({
    quotation_id: quotationId,
    product_id: item.product_id,
    quantity: item.quantity,
    selling_price: item.selling_price,
    cost_price: item.cost_price,
    total: item.quantity * item.selling_price,
  }))
}

function revalidateQuotationPaths(id?: string) {
  revalidateModule("/quotations")
  if (id) {
    revalidateModule(`/quotations/${id}`)
    revalidateModule(`/quotations/${id}/edit`)
  }
}

export async function createQuotation(data: {
  customer_id: string
  date?: string
  valid_until?: string
  discount?: number
  vat_percentage?: number
  delivery_cost?: number
  payment_terms?: string
  notes?: string
  items: QuotationLine[]
}) {
  const supabase = await createClient()

  if (!data.items.length) return { error: "Add at least one product" }

  const { data: existing } = await supabase
    .from("quotations")
    .select("quotation_number")
    .order("created_at", { ascending: false })
    .limit(1)

  const lastNum = existing?.[0]?.quotation_number
  const seq = lastNum ? parseInt(lastNum.split("-").pop() || "0", 10) + 1 : 1
  const quotationNumber = generateInvoiceNumber("QUO", seq)

  const { subtotal, discount, vatAmount, deliveryCost, totalAmount } =
    computeTotals(data)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .insert({
      quotation_number: quotationNumber,
      customer_id: data.customer_id,
      date: data.date || todayISO(),
      valid_until: data.valid_until || null,
      subtotal,
      discount,
      vat_amount: vatAmount,
      delivery_cost: deliveryCost,
      total_amount: totalAmount,
      status: "draft",
      payment_terms: data.payment_terms || null,
      notes: data.notes || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (quotationError) return { error: quotationError.message }

  const { error: itemsError } = await supabase
    .from("quotation_items")
    .insert(buildItemRows(quotation.id, data.items))
  if (itemsError) return { error: itemsError.message }

  revalidateQuotationPaths(quotation.id)
  return { success: true, id: quotation.id }
}

export async function updateQuotation(data: {
  id: string
  customer_id: string
  date?: string
  valid_until?: string
  discount?: number
  vat_percentage?: number
  delivery_cost?: number
  payment_terms?: string
  notes?: string
  items: QuotationLine[]
}) {
  const supabase = await createClient()

  if (!data.items.length) return { error: "Add at least one product" }

  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .select("id, status")
    .eq("id", data.id)
    .single()
  if (quotationError || !quotation) return { error: "Quotation not found" }
  if (quotation.status === "converted") {
    return { error: "Converted quotations cannot be edited" }
  }

  const { subtotal, discount, vatAmount, deliveryCost, totalAmount } =
    computeTotals(data)

  const { error: updateError } = await supabase
    .from("quotations")
    .update({
      customer_id: data.customer_id,
      date: data.date || todayISO(),
      valid_until: data.valid_until || null,
      subtotal,
      discount,
      vat_amount: vatAmount,
      delivery_cost: deliveryCost,
      total_amount: totalAmount,
      payment_terms: data.payment_terms || null,
      notes: data.notes || null,
    })
    .eq("id", data.id)
  if (updateError) return { error: updateError.message }

  const { error: deleteItemsError } = await supabase
    .from("quotation_items")
    .delete()
    .eq("quotation_id", data.id)
  if (deleteItemsError) return { error: deleteItemsError.message }

  const { error: insertItemsError } = await supabase
    .from("quotation_items")
    .insert(buildItemRows(data.id, data.items))
  if (insertItemsError) return { error: insertItemsError.message }

  revalidateQuotationPaths(data.id)
  return { success: true }
}

export async function updateQuotationStatus(
  id: string,
  status: Exclude<QuotationStatus, "converted">
) {
  const supabase = await createClient()
  const { data: quotation } = await supabase
    .from("quotations")
    .select("status")
    .eq("id", id)
    .single()
  if (!quotation) return { error: "Quotation not found" }
  if (quotation.status === "converted") {
    return { error: "Converted quotations cannot change status" }
  }
  const { error } = await supabase
    .from("quotations")
    .update({ status })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidateQuotationPaths(id)
  return { success: true }
}

export async function deleteQuotation(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("quotations").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateQuotationPaths()
  return { success: true }
}

/**
 * Convert a quotation into a Sales Invoice.
 *
 * Copies customer, line items, discount, VAT, delivery cost, payment terms
 * and notes onto a new invoice; checks and deducts stock; adds the invoice
 * total to the customer's balance; then marks the quotation as converted
 * and links the two documents.
 */
export async function convertQuotationToInvoice(quotationId: string) {
  const supabase = await createClient()

  const [{ data: quotation, error: quotationError }, { data: items }] =
    await Promise.all([
      supabase.from("quotations").select("*").eq("id", quotationId).single(),
      supabase
        .from("quotation_items")
        .select("product_id, quantity, selling_price, cost_price")
        .eq("quotation_id", quotationId),
    ])

  if (quotationError || !quotation) return { error: "Quotation not found" }
  if (quotation.status === "converted") {
    return { error: "This quotation was already converted to an invoice" }
  }
  if (quotation.status === "rejected") {
    return { error: "Rejected quotations cannot be converted" }
  }
  const quotationItems = items ?? []
  if (!quotationItems.length) {
    return { error: "Quotation has no items to convert" }
  }

  // Check stock availability for every line before touching anything.
  for (const item of quotationItems) {
    const { data: product } = await supabase
      .from("products")
      .select("quantity, name")
      .eq("id", item.product_id)
      .single()
    if (!product || product.quantity < item.quantity) {
      return {
        error: `Insufficient stock for ${product?.name ?? "product"}`,
      }
    }
  }

  const { data: existing } = await supabase
    .from("invoices")
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1)
  const lastNum = existing?.[0]?.invoice_number
  const seq = lastNum ? parseInt(lastNum.split("-").pop() || "0", 10) + 1 : 1
  const invoiceNumber = generateInvoiceNumber("INV", seq)

  const totalAmount = parseNumber(quotation.total_amount)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      customer_id: quotation.customer_id,
      date: todayISO(),
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      vat_amount: quotation.vat_amount,
      delivery_cost: quotation.delivery_cost,
      total_amount: totalAmount,
      paid_amount: 0,
      remaining_balance: totalAmount,
      payment_status: "unpaid",
      payment_terms: quotation.payment_terms,
      quotation_id: quotation.id,
      notes: quotation.notes,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (invoiceError) return { error: invoiceError.message }

  const invoiceItems = quotationItems.map((item) => ({
    invoice_id: invoice.id,
    product_id: item.product_id,
    quantity: item.quantity,
    selling_price: item.selling_price,
    cost_price: item.cost_price,
    profit: calculateItemProfit(
      parseNumber(item.selling_price),
      parseNumber(item.cost_price),
      parseNumber(item.quantity)
    ),
    total: parseNumber(item.quantity) * parseNumber(item.selling_price),
  }))

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(invoiceItems)
  if (itemsError) return { error: itemsError.message }

  // Deduct stock.
  for (const item of quotationItems) {
    const { data: product } = await supabase
      .from("products")
      .select("quantity")
      .eq("id", item.product_id)
      .single()
    await supabase
      .from("products")
      .update({
        quantity: Math.max(0, parseNumber(product?.quantity) - item.quantity),
      })
      .eq("id", item.product_id)
  }

  // Whole invoice is unpaid, so the full total goes onto the customer balance.
  const { data: customer } = await supabase
    .from("customers")
    .select("current_balance")
    .eq("id", quotation.customer_id)
    .single()
  await supabase
    .from("customers")
    .update({
      current_balance: parseNumber(customer?.current_balance) + totalAmount,
    })
    .eq("id", quotation.customer_id)

  // Mark the quotation converted and link the invoice.
  await supabase
    .from("quotations")
    .update({ status: "converted", converted_invoice_id: invoice.id })
    .eq("id", quotation.id)

  revalidateQuotationPaths(quotation.id)
  revalidateModule("/invoices")
  revalidateModule(`/invoices/${invoice.id}`)
  revalidateModule("/customers")
  revalidateModule("/products")
  revalidateModule("/reports")
  revalidateModule("/")
  return { success: true, invoiceId: invoice.id, invoiceNumber }
}
