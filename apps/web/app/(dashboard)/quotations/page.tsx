import { createClient } from "@/lib/supabase/server"
import { QuotationsView } from "@/components/quotations/quotations-view"

export default async function QuotationsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("quotations")
    .select("*, customers(name)")
    .order("created_at", { ascending: false })

  return <QuotationsView quotations={data ?? []} />
}
