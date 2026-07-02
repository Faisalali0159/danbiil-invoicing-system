import { createClient } from "@/lib/supabase/server"
import { SuppliersView } from "@/components/suppliers/suppliers-view"

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .order("name")

  return <SuppliersView suppliers={data ?? []} />
}
