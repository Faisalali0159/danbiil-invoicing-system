import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { formatCurrency } from "@/lib/utils/finance"
import type { DashboardStats } from "@/types/database"
import { dashboardCards } from "@/lib/config/navigation"

interface StatCardsProps {
  stats: DashboardStats
}

const variantStyles = {
  default: "text-foreground",
  warning: "text-amber-600 dark:text-amber-400",
  destructive: "text-destructive",
  success: "text-emerald-600 dark:text-emerald-400",
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {dashboardCards.map((card) => {
        const value = stats[card.key as keyof DashboardStats]
        return (
          <Card key={card.key} size="sm">
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle
                className={variantStyles[card.variant]}
              >
                {formatCurrency(value)}
              </CardTitle>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}

interface ChartPlaceholderProps {
  title: string
  description: string
}

export function ChartPlaceholder({ title, description }: ChartPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Chart data will appear when connected to Supabase
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
