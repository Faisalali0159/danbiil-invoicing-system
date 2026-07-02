import { createClient } from "@/lib/supabase/server"
import { parseNumber } from "@/lib/actions/utils"

export async function getReportData() {
  const supabase = await createClient()
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
    .toISOString()
    .split("T")[0]

  const [
    invoices,
    purchases,
    customers,
    suppliers,
    expenses,
    deliveries,
    commissions,
    invoiceItems,
  ] = await Promise.all([
    supabase.from("invoices").select("total_amount").gte("date", monthStart),
    supabase.from("purchases").select("total_amount").gte("purchase_date", monthStart),
    supabase.from("customers").select("current_balance"),
    supabase.from("suppliers").select("current_balance"),
    supabase.from("expenses").select("amount").gte("date", monthStart),
    supabase.from("deliveries").select("cost").gte("date", monthStart),
    supabase.from("commissions").select("amount").gte("date", monthStart),
    supabase.from("invoice_items").select("profit"),
  ])

  const sum = (rows: { total_amount?: number; amount?: number; cost?: number }[] | null, key: string) =>
    (rows ?? []).reduce((acc, r) => acc + parseNumber(r[key as keyof typeof r]), 0)

  const grossProfit = (invoiceItems.data ?? []).reduce(
    (acc, i) => acc + parseNumber(i.profit),
    0
  )
  const totalExpenses = sum(expenses.data, "amount")
  const deliveryCosts = sum(deliveries.data, "cost")
  const totalCommissions = sum(commissions.data, "amount")
  const totalPurchases = sum(purchases.data, "total_amount")

  return {
    totalSales: sum(invoices.data, "total_amount"),
    totalPurchases,
    customerDebt: (customers.data ?? []).reduce(
      (acc, c) => acc + parseNumber(c.current_balance),
      0
    ),
    supplierDebt: (suppliers.data ?? []).reduce(
      (acc, s) => acc + parseNumber(s.current_balance),
      0
    ),
    totalExpenses,
    deliveryCosts,
    totalCommissions,
    grossProfit,
    netProfit: grossProfit - totalExpenses - deliveryCosts - totalCommissions,
  }
}
