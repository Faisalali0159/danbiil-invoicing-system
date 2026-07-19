import { createClient } from "@/lib/supabase/server"
import { InvoicesView } from "@/components/invoices/invoices-view"

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("invoices")
    .select("*, customers(name, company_name)")
    .order("created_at", { ascending: false })

  return <InvoicesView invoices={data ?? []} />
}
