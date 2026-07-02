import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { InvoiceForm } from "@/components/invoices/invoice-form"

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [invoiceResult, itemsResult, customersResult, productsResult, taxSettingsResult] =
    await Promise.all([
      supabase.from("invoices").select("*").eq("id", id).single(),
      supabase
        .from("invoice_items")
        .select("product_id, quantity, selling_price, cost_price")
        .eq("invoice_id", id),
      supabase.from("customers").select("*").order("name"),
      supabase.from("products").select("*").order("name"),
      supabase
        .from("tax_settings")
        .select("*")
        .eq("active", true)
        .limit(1)
        .maybeSingle(),
    ])

  const invoice = invoiceResult.data
  if (invoiceResult.error || !invoice) {
    notFound()
  }

  return (
    <InvoiceForm
      mode="edit"
      customers={customersResult.data ?? []}
      products={productsResult.data ?? []}
      vatPercentage={Number(taxSettingsResult.data?.percentage ?? 0)}
      initialInvoice={{
        id: invoice.id,
        customer_id: invoice.customer_id,
        date: invoice.date,
        discount: Number(invoice.discount),
        delivery_cost: Number(invoice.delivery_cost),
        paid_amount: Number(invoice.paid_amount),
        notes: invoice.notes,
        items: (itemsResult.data ?? []).map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
          selling_price: Number(item.selling_price),
          cost_price: Number(item.cost_price),
        })),
      }}
    />
  )
}
