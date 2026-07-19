import { createClient } from "@/lib/supabase/server"
import { QuotationForm } from "@/components/quotations/quotation-form"

export default async function NewQuotationPage() {
  const supabase = await createClient()
  const [customers, products, taxSettings] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase.from("products").select("*").order("name"),
    supabase.from("tax_settings").select("*").eq("active", true).limit(1).maybeSingle(),
  ])

  const vatPercentage = taxSettings.data?.percentage ?? 0

  return (
    <QuotationForm
      customers={customers.data ?? []}
      products={products.data ?? []}
      vatPercentage={Number(vatPercentage)}
    />
  )
}
