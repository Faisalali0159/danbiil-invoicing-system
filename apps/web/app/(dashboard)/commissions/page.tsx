import { createClient } from "@/lib/supabase/server"
import { CommissionsView } from "@/components/commissions/commissions-view"

export default async function CommissionsPage() {
  const supabase = await createClient()
  const [commissions, employees, invoices] = await Promise.all([
    supabase
      .from("commissions")
      .select("*, profiles(full_name), invoices(invoice_number)")
      .order("date", { ascending: false }),
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase.from("invoices").select("id, invoice_number, total_amount").order("created_at", { ascending: false }),
  ])

  return (
    <CommissionsView
      commissions={commissions.data ?? []}
      employees={employees.data ?? []}
      invoices={invoices.data ?? []}
    />
  )
}
