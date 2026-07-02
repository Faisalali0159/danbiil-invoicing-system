import { ChartPlaceholder, StatCards } from "@/components/dashboard-stats"
import { getDashboardStats } from "@/lib/data/dashboard"

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <StatCards stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPlaceholder
          title="Sales Trend"
          description="Daily and monthly sales performance"
        />
        <ChartPlaceholder
          title="Profit Trend"
          description="Gross and net profit over time"
        />
        <ChartPlaceholder
          title="Top Products"
          description="Best selling products by revenue"
        />
        <ChartPlaceholder
          title="Customer Debt"
          description="Outstanding balances by customer"
        />
      </div>
    </div>
  )
}
