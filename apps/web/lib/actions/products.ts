"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateModule, parseNumber } from "./utils"

export async function createProduct(data: {
  name: string
  category_id?: string
  barcode?: string
  purchase_price: number
  selling_price: number
  quantity: number
  min_stock_alert?: number
  unit?: string
  supplier_id?: string
}) {
  const supabase = await createClient()
  if (!data.supplier_id) return { error: "Supplier is required for each product." }
  const { error } = await supabase.from("products").insert({
    name: data.name,
    category_id: data.category_id || null,
    barcode: data.barcode || null,
    purchase_price: parseNumber(data.purchase_price),
    selling_price: parseNumber(data.selling_price),
    quantity: parseNumber(data.quantity),
    min_stock_alert: parseNumber(data.min_stock_alert),
    unit: data.unit || "pcs",
    supplier_id: data.supplier_id || null,
  })
  if (error) return { error: error.message }
  revalidateModule("/products")
  revalidateModule("/")
  return { success: true }
}

export async function updateProduct(
  id: string,
  data: {
    name: string
    category_id?: string
    barcode?: string
    purchase_price: number
    selling_price: number
    quantity: number
    min_stock_alert?: number
    unit?: string
    supplier_id?: string
  }
) {
  const supabase = await createClient()
  if (!data.supplier_id) return { error: "Supplier is required for each product." }
  const { error } = await supabase
    .from("products")
    .update({
      name: data.name,
      category_id: data.category_id || null,
      barcode: data.barcode || null,
      purchase_price: parseNumber(data.purchase_price),
      selling_price: parseNumber(data.selling_price),
      quantity: parseNumber(data.quantity),
      min_stock_alert: parseNumber(data.min_stock_alert),
      unit: data.unit || "pcs",
      supplier_id: data.supplier_id || null,
    })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/products")
  revalidateModule("/")
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateModule("/products")
  revalidateModule("/")
  return { success: true }
}
