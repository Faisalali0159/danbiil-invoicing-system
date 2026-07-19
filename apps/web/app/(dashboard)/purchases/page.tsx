import { createClient } from "@/lib/supabase/server"
import { PurchasesView } from "@/components/purchases/purchases-view"

export default async function PurchasesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("purchases")
    .select("*, suppliers(name, company_name)")
    .order("created_at", { ascending: false })

  return <PurchasesView purchases={data ?? []} />
}
