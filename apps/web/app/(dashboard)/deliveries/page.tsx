import { createClient } from "@/lib/supabase/server"
import { DeliveriesView } from "@/components/deliveries/deliveries-view"

export default async function DeliveriesPage() {
  const supabase = await createClient()
  const [deliveries, invoices] = await Promise.all([
    supabase
      .from("deliveries")
      .select("*, invoices(invoice_number)")
      .order("date", { ascending: false }),
    supabase.from("invoices").select("id, invoice_number").order("created_at", { ascending: false }),
  ])

  return (
    <DeliveriesView
      deliveries={deliveries.data ?? []}
      invoices={invoices.data ?? []}
    />
  )
}
