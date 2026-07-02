import { createClient } from "@/lib/supabase/server"
import { PaymentsView } from "@/components/payments/payments-view"

export default async function PaymentsPage() {
  const supabase = await createClient()
  const [payments, customers, suppliers, invoices, purchases] =
    await Promise.all([
      supabase
        .from("payments")
        .select("*, customers(name), suppliers(name), invoices(invoice_number), purchases(invoice_number)")
        .order("payment_date", { ascending: false }),
      supabase.from("customers").select("*").order("name"),
      supabase.from("suppliers").select("*").order("name"),
      supabase
        .from("invoices")
        .select("id, invoice_number, remaining_balance")
        .gt("remaining_balance", 0),
      supabase
        .from("purchases")
        .select("id, invoice_number, remaining_balance")
        .gt("remaining_balance", 0),
    ])

  return (
    <PaymentsView
      payments={payments.data ?? []}
      customers={customers.data ?? []}
      suppliers={suppliers.data ?? []}
      invoices={invoices.data ?? []}
      purchases={purchases.data ?? []}
    />
  )
}
