import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Box,
  CreditCard,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  roles?: string[]
}

export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Quotations", href: "/quotations", icon: FileSpreadsheet },
  { title: "Invoices", href: "/invoices", icon: FileText },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Products", href: "/products", icon: Package },
  { title: "Purchases", href: "/purchases", icon: ShoppingCart },
  { title: "Borrowed", href: "/borrowed", icon: Warehouse },
  { title: "Payments", href: "/payments", icon: CreditCard },
  { title: "Expenses", href: "/expenses", icon: Receipt, roles: ["owner", "admin", "accountant"] },
  { title: "Deliveries", href: "/deliveries", icon: Truck },
  { title: "Commissions", href: "/commissions", icon: CreditCard, roles: ["owner", "admin", "accountant"] },
  { title: "Reports", href: "/reports", icon: BarChart3, roles: ["owner", "admin", "accountant"] },
  { title: "Suppliers", href: "/suppliers", icon: Box },
  { title: "Settings", href: "/settings", icon: Settings, roles: ["owner", "admin"] },
]

export const dashboardCards = [
  { key: "todaySales", title: "Today's Sales", variant: "default" as const },
  { key: "weeklySales", title: "Weekly Sales", variant: "default" as const },
  { key: "monthlySales", title: "Monthly Sales", variant: "default" as const },
  { key: "outstandingDebt", title: "Customer Debt", variant: "warning" as const },
  { key: "supplierDebt", title: "Supplier Debt", variant: "warning" as const },
  { key: "stockValue", title: "Stock Value", variant: "default" as const },
  { key: "totalExpenses", title: "Total Expenses", variant: "destructive" as const },
  { key: "deliveryCosts", title: "Delivery Costs", variant: "default" as const },
  { key: "grossProfit", title: "Gross Profit", variant: "success" as const },
  { key: "netProfit", title: "Net Profit", variant: "success" as const },
]
