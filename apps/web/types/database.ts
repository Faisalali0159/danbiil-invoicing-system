export type UserRole =
  | "owner"
  | "admin"
  | "sales_staff"
  | "store_manager"
  | "accountant"

export type PaymentStatus = "paid" | "partial" | "unpaid" | "overdue"

export type PurchaseStatus = "paid" | "partial" | "unpaid"

export type CommissionStatus = "pending" | "paid" | "cancelled"

export type DeliveryStatus =
  | "pending"
  | "in_transit"
  | "delivered"
  | "cancelled"

export type PaymentType =
  | "customer_payment"
  | "supplier_payment"
  | "expense"
  | "other"

export type DocumentType =
  | "invoice"
  | "receipt"
  | "report"
  | "product_image"
  | "logo"

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  commission_rate: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  address: string | null
  company_name: string | null
  credit_limit: number
  current_balance: number
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  company_name: string | null
  current_balance: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Product {
  id: string
  name: string
  category_id: string | null
  barcode: string | null
  purchase_price: number
  selling_price: number
  quantity: number
  min_stock_alert: number
  unit: string
  supplier_id: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  customer_id: string
  date: string
  subtotal: number
  discount: number
  vat_amount: number
  delivery_cost: number
  total_amount: number
  paid_amount: number
  remaining_balance: number
  payment_status: PaymentStatus
  notes: string | null
  pdf_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  product_id: string
  quantity: number
  selling_price: number
  cost_price: number
  profit: number
  total: number
}

export interface Expense {
  id: string
  category: string
  description: string | null
  amount: number
  date: string
  created_by: string | null
  created_at: string
}

export interface DashboardStats {
  todaySales: number
  weeklySales: number
  monthlySales: number
  outstandingDebt: number
  supplierDebt: number
  stockValue: number
  totalExpenses: number
  deliveryCosts: number
  grossProfit: number
  netProfit: number
}
