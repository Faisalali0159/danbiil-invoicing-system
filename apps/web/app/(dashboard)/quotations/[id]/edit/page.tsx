import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuotationForm } from "@/components/quotations/quotation-form"

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    quotationResult,
    itemsResult,
    customersResult,
    productsResult,
    taxSettingsResult,
  ] = await Promise.all([
    supabase.from("quotations").select("*").eq("id", id).single(),
    supabase
      .from("quotation_items")
      .select("product_id, quantity, selling_price, cost_price")
      .eq("quotation_id", id),
    supabase.from("customers").select("*").order("name"),
    supabase.from("products").select("*").order("name"),
    supabase
      .from("tax_settings")
      .select("*")
      .eq("active", true)
      .limit(1)
      .maybeSingle(),
  ])

  const quotation = quotationResult.data
  if (quotationResult.error || !quotation) {
    notFound()
  }
  if (quotation.status === "converted") {
    redirect(`/quotations/${quotation.id}`)
  }

  return (
    <QuotationForm
      mode="edit"
      customers={customersResult.data ?? []}
      products={productsResult.data ?? []}
      vatPercentage={Number(taxSettingsResult.data?.percentage ?? 0)}
      initialQuotation={{
        id: quotation.id,
        customer_id: quotation.customer_id,
        date: quotation.date,
        valid_until: quotation.valid_until,
        discount: Number(quotation.discount),
        delivery_cost: Number(quotation.delivery_cost),
        payment_terms: quotation.payment_terms,
        notes: quotation.notes,
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
