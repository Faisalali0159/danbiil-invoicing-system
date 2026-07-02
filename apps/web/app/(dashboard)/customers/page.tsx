import { createClient } from "@/lib/supabase/server"
import { CustomersView } from "@/components/customers/customers-view"

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("customers")
    .select("*")
    .order("name")

  return <CustomersView customers={data ?? []} />
}
