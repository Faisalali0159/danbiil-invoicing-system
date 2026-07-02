import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { formatCurrency } from "@/lib/utils/finance"
import { PageHeader } from "@/components/shared/page-header"

interface ReportData {
  totalSales: number
  totalPurchases: number
  customerDebt: number
  supplierDebt: number
  totalExpenses: number
  deliveryCosts: number
  totalCommissions: number
  grossProfit: number
  netProfit: number
}

export function ReportsView({ data }: { data: ReportData }) {
  const costs =
    data.totalPurchases +
    data.totalExpenses +
    data.deliveryCosts +
    data.totalCommissions

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Financial Reports"
        description="Monthly revenue, costs, and profit summary"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Total sales this period</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data.totalSales)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costs</CardTitle>
            <CardDescription>Purchases, expenses, delivery, commissions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">
              {formatCurrency(costs)}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>Purchases: {formatCurrency(data.totalPurchases)}</li>
              <li>Expenses: {formatCurrency(data.totalExpenses)}</li>
              <li>Delivery: {formatCurrency(data.deliveryCosts)}</li>
              <li>Commissions: {formatCurrency(data.totalCommissions)}</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding Debt</CardTitle>
            <CardDescription>Customer and supplier balances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Customer debt: <span className="font-medium">{formatCurrency(data.customerDebt)}</span></p>
            <p>Supplier debt: <span className="font-medium">{formatCurrency(data.supplierDebt)}</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit</CardTitle>
            <CardDescription>Gross and net profit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Gross: <span className="font-medium text-foreground">{formatCurrency(data.grossProfit)}</span>
            </p>
            <p className="text-2xl font-semibold">
              Net: {formatCurrency(data.netProfit)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
