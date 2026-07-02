import type { DashboardStats } from "@/types/database"
import { createClient } from "@/lib/supabase/server"

const emptyStats: DashboardStats = {
  todaySales: 0,
  weeklySales: 0,
  monthlySales: 0,
  outstandingDebt: 0,
  supplierDebt: 0,
  stockValue: 0,
  totalExpenses: 0,
  deliveryCosts: 0,
  grossProfit: 0,
  netProfit: 0,
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return emptyStats
  }

  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split("T")[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )
      .toISOString()
      .split("T")[0]

    const [
      todayInvoices,
      weeklyInvoices,
      monthlyInvoices,
      customers,
      suppliers,
      products,
      expenses,
      deliveries,
      invoiceItems,
    ] = await Promise.all([
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("date", today),
      supabase
        .from("invoices")
        .select("total_amount")
        .gte("date", weekAgo),
      supabase
        .from("invoices")
        .select("total_amount")
        .gte("date", monthStart),
      supabase.from("customers").select("current_balance"),
      supabase.from("suppliers").select("current_balance"),
      supabase.from("products").select("purchase_price, quantity"),
      supabase.from("expenses").select("amount"),
      supabase.from("deliveries").select("cost"),
      supabase
        .from("invoice_items")
        .select("profit, total"),
    ])

    const sum = (rows: { total_amount?: number; amount?: number; cost?: number }[] | null, key: string) =>
      (rows ?? []).reduce((acc, row) => acc + Number(row[key as keyof typeof row] ?? 0), 0)

    const grossProfit = (invoiceItems.data ?? []).reduce(
      (acc, item) => acc + Number(item.profit),
      0
    )
    const totalExpenses = sum(expenses.data, "amount")
    const deliveryCosts = sum(deliveries.data, "cost")

    return {
      todaySales: sum(todayInvoices.data, "total_amount"),
      weeklySales: sum(weeklyInvoices.data, "total_amount"),
      monthlySales: sum(monthlyInvoices.data, "total_amount"),
      outstandingDebt: (customers.data ?? []).reduce(
        (acc, c) => acc + Number(c.current_balance),
        0
      ),
      supplierDebt: (suppliers.data ?? []).reduce(
        (acc, s) => acc + Number(s.current_balance),
        0
      ),
      stockValue: (products.data ?? []).reduce(
        (acc, p) => acc + Number(p.purchase_price) * Number(p.quantity),
        0
      ),
      totalExpenses,
      deliveryCosts,
      grossProfit,
      netProfit: grossProfit - totalExpenses - deliveryCosts,
    }
  } catch {
    return emptyStats
  }
}
