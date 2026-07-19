"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber, todayISO } from "./utils"
import {
  calculateItemProfit,
  calculateVat,
  generateInvoiceNumber,
} from "@/lib/utils/finance"

type InvoiceLine = {
  product_id: string
  quantity: number
  selling_price: number
  cost_price: number
}

const AUTO_INVOICE_PAYMENT_NOTE = "Auto payment from invoice form"

export async function createInvoice(data: {
  customer_id: string
  date?: string
  discount?: number
  vat_percentage?: number
  delivery_cost?: number
  paid_amount?: number
  payment_terms?: string
  notes?: string
  items: InvoiceLine[]
}) {
  const supabase = await createClient()

  if (!data.items.length) return { error: "Add at least one product" }

  const { data: existing } = await supabase
    .from("invoices")
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1)

  const lastNum = existing?.[0]?.invoice_number
  const seq = lastNum ? parseInt(lastNum.split("-").pop() || "0", 10) + 1 : 1
  const invoiceNumber = generateInvoiceNumber("INV", seq)

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.selling_price,
    0
  )
  const discount = parseNumber(data.discount)
  const afterDiscount = subtotal - discount
  const vatAmount = calculateVat(afterDiscount, parseNumber(data.vat_percentage))
  const deliveryCost = parseNumber(data.delivery_cost)
  const totalAmount = afterDiscount + vatAmount + deliveryCost
  const paidAmount = parseNumber(data.paid_amount)
  const remaining = totalAmount - paidAmount

  let paymentStatus: "paid" | "partial" | "unpaid" = "unpaid"
  if (paidAmount >= totalAmount) paymentStatus = "paid"
  else if (paidAmount > 0) paymentStatus = "partial"

  const {
    data: { user },
  } = await supabase.auth.getUser()

  for (const item of data.items) {
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

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      customer_id: data.customer_id,
      date: data.date || todayISO(),
      subtotal,
      discount,
      vat_amount: vatAmount,
      delivery_cost: deliveryCost,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining_balance: remaining,
      payment_status: paymentStatus,
      payment_terms: data.payment_terms || null,
      notes: data.notes || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (invoiceError) return { error: invoiceError.message }

  const invoiceItems = data.items.map((item) => ({
    invoice_id: invoice.id,
    product_id: item.product_id,
    quantity: item.quantity,
    selling_price: item.selling_price,
    cost_price: item.cost_price,
    profit: calculateItemProfit(
      item.selling_price,
      item.cost_price,
      item.quantity
    ),
    total: item.quantity * item.selling_price,
  }))

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(invoiceItems)
  if (itemsError) return { error: itemsError.message }

  for (const item of data.items) {
    const { data: product } = await supabase
      .from("products")
      .select("quantity")
      .eq("id", item.product_id)
      .single()
    await supabase
      .from("products")
      .update({ quantity: (product?.quantity ?? 0) - item.quantity })
      .eq("id", item.product_id)
  }

  if (remaining > 0) {
    const { data: customer } = await supabase
      .from("customers")
      .select("current_balance")
      .eq("id", data.customer_id)
      .single()
    await supabase
      .from("customers")
      .update({
        current_balance: parseNumber(customer?.current_balance) + remaining,
      })
      .eq("id", data.customer_id)
  }

  if (paidAmount > 0) {
    const { error: paymentError } = await supabase.from("payments").insert({
      payment_type: "customer_payment",
      customer_id: data.customer_id,
      invoice_id: invoice.id,
      amount: paidAmount,
      payment_date: data.date || todayISO(),
      notes: AUTO_INVOICE_PAYMENT_NOTE,
      created_by: user?.id ?? null,
    })
    if (paymentError) return { error: paymentError.message }
  }

  revalidateModule("/invoices")
  revalidateModule(`/invoices/${invoice.id}`)
  revalidateModule("/")
  revalidateModule("/customers")
  revalidateModule("/products")
  revalidateModule("/payments")
  revalidateModule("/reports")
  return { success: true, id: invoice.id }
}

export async function updateInvoice(data: {
  id: string
  customer_id: string
  date?: string
  discount?: number
  vat_percentage?: number
  delivery_cost?: number
  paid_amount?: number
  payment_terms?: string
  notes?: string
  items: InvoiceLine[]
}) {
  const supabase = await createClient()

  if (!data.items.length) return { error: "Add at least one product" }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, customer_id, remaining_balance, paid_amount, total_amount")
    .eq("id", data.id)
    .single()
  if (invoiceError || !invoice) return { error: "Invoice not found" }

  const { data: existingItems } = await supabase
    .from("invoice_items")
    .select("product_id, quantity")
    .eq("invoice_id", data.id)

  const previousQtyByProduct = new Map<string, number>()
  for (const item of existingItems ?? []) {
    previousQtyByProduct.set(
      item.product_id,
      (previousQtyByProduct.get(item.product_id) ?? 0) + parseNumber(item.quantity)
    )
  }

  const nextQtyByProduct = new Map<string, number>()
  for (const item of data.items) {
    nextQtyByProduct.set(
      item.product_id,
      (nextQtyByProduct.get(item.product_id) ?? 0) + parseNumber(item.quantity)
    )
  }

  const productIds = Array.from(
    new Set([
      ...Array.from(previousQtyByProduct.keys()),
      ...Array.from(nextQtyByProduct.keys()),
    ])
  )

  const { data: products } = await supabase
    .from("products")
    .select("id, name, quantity")
    .in("id", productIds)

  const productById = new Map((products ?? []).map((product) => [product.id, product]))

  for (const [productId, nextQty] of nextQtyByProduct) {
    const product = productById.get(productId)
    const previousQty = previousQtyByProduct.get(productId) ?? 0
    const availableQty = parseNumber(product?.quantity) + previousQty
    if (!product || nextQty > availableQty) {
      return {
        error: `Insufficient stock for ${product?.name ?? "product"}`,
      }
    }
  }

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.selling_price,
    0
  )
  const discount = parseNumber(data.discount)
  const afterDiscount = subtotal - discount
  const vatAmount = calculateVat(afterDiscount, parseNumber(data.vat_percentage))
  const deliveryCost = parseNumber(data.delivery_cost)
  const totalAmount = afterDiscount + vatAmount + deliveryCost
  const paidAmount = parseNumber(data.paid_amount, parseNumber(invoice.paid_amount))
  const remaining = Math.max(0, totalAmount - paidAmount)

  let paymentStatus: "paid" | "partial" | "unpaid" = "unpaid"
  if (paidAmount >= totalAmount) paymentStatus = "paid"
  else if (paidAmount > 0) paymentStatus = "partial"

  await supabase
    .from("invoices")
    .update({
      customer_id: data.customer_id,
      date: data.date || todayISO(),
      subtotal,
      discount,
      vat_amount: vatAmount,
      delivery_cost: deliveryCost,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining_balance: remaining,
      payment_status: paymentStatus,
      payment_terms: data.payment_terms || null,
      notes: data.notes || null,
    })
    .eq("id", data.id)

  const { error: deleteItemsError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", data.id)
  if (deleteItemsError) return { error: deleteItemsError.message }

  const nextItems = data.items.map((item) => ({
    invoice_id: data.id,
    product_id: item.product_id,
    quantity: item.quantity,
    selling_price: item.selling_price,
    cost_price: item.cost_price,
    profit: calculateItemProfit(
      item.selling_price,
      item.cost_price,
      item.quantity
    ),
    total: item.quantity * item.selling_price,
  }))
  const { error: insertItemsError } = await supabase
    .from("invoice_items")
    .insert(nextItems)
  if (insertItemsError) return { error: insertItemsError.message }

  for (const productId of productIds) {
    const product = productById.get(productId)
    const previousQty = previousQtyByProduct.get(productId) ?? 0
    const nextQty = nextQtyByProduct.get(productId) ?? 0
    const updatedQty = parseNumber(product?.quantity) + previousQty - nextQty
    await supabase
      .from("products")
      .update({ quantity: Math.max(0, updatedQty) })
      .eq("id", productId)
  }

  const previousRemaining = parseNumber(invoice.remaining_balance)
  if (invoice.customer_id === data.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("current_balance")
      .eq("id", data.customer_id)
      .single()
    const adjustedBalance =
      Math.max(0, parseNumber(customer?.current_balance) - previousRemaining) +
      remaining
    await supabase
      .from("customers")
      .update({ current_balance: adjustedBalance })
      .eq("id", data.customer_id)
  } else {
    const [{ data: oldCustomer }, { data: newCustomer }] = await Promise.all([
      supabase
        .from("customers")
        .select("current_balance")
        .eq("id", invoice.customer_id)
        .single(),
      supabase
        .from("customers")
        .select("current_balance")
        .eq("id", data.customer_id)
        .single(),
    ])

    await Promise.all([
      supabase
        .from("customers")
        .update({
          current_balance: Math.max(
            0,
            parseNumber(oldCustomer?.current_balance) - previousRemaining
          ),
        })
        .eq("id", invoice.customer_id),
      supabase
        .from("customers")
        .update({
          current_balance: parseNumber(newCustomer?.current_balance) + remaining,
        })
        .eq("id", data.customer_id),
    ])
  }

  const { data: autoPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("invoice_id", data.id)
    .eq("payment_type", "customer_payment")
    .eq("notes", AUTO_INVOICE_PAYMENT_NOTE)
    .maybeSingle()

  if (paidAmount > 0) {
    if (autoPayment?.id) {
      await supabase
        .from("payments")
        .update({
          customer_id: data.customer_id,
          amount: paidAmount,
          payment_date: data.date || todayISO(),
        })
        .eq("id", autoPayment.id)
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      await supabase.from("payments").insert({
        payment_type: "customer_payment",
        customer_id: data.customer_id,
        invoice_id: data.id,
        amount: paidAmount,
        payment_date: data.date || todayISO(),
        notes: AUTO_INVOICE_PAYMENT_NOTE,
        created_by: user?.id ?? null,
      })
    }
  } else if (autoPayment?.id) {
    await supabase.from("payments").delete().eq("id", autoPayment.id)
  }

  revalidateModule("/invoices")
  revalidateModule(`/invoices/${data.id}`)
  revalidateModule(`/invoices/${data.id}/edit`)
  revalidateModule("/customers")
  revalidateModule("/products")
  revalidateModule("/payments")
  revalidateModule("/reports")
  revalidateModule("/")
  return { success: true }
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("invoices").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/invoices")
  revalidateModule("/")
  return { success: true }
}
