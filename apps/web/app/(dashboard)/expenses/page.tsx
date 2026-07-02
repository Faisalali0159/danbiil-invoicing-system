import { createClient } from "@/lib/supabase/server"
import { ExpensesView } from "@/components/expenses/expenses-view"

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false })

  return <ExpensesView expenses={data ?? []} />
}
