const CURRENCY = "USD"

export function formatCurrency(amount: number, currency = CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function calculateItemProfit(
  sellingPrice: number,
  costPrice: number,
  quantity: number
): number {
  return (sellingPrice - costPrice) * quantity
}

export function calculateInvoiceTotals(items: {
  quantity: number
  selling_price: number
}[]): number {
  return items.reduce(
    (sum, item) => sum + item.quantity * item.selling_price,
    0
  )
}

export function calculateVat(subtotal: number, vatPercentage: number): number {
  return subtotal * (vatPercentage / 100)
}

export function calculateNetProfit(params: {
  grossProfit: number
  commission: number
  deliveryCost: number
  expenses: number
}): number {
  return (
    params.grossProfit -
    params.commission -
    params.deliveryCost -
    params.expenses
  )
}

export function calculateCommission(
  invoiceTotal: number,
  percentage: number
): number {
  return invoiceTotal * (percentage / 100)
}

export function generateInvoiceNumber(
  prefix = "INV",
  sequence = 1,
  year = new Date().getFullYear()
): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`
}

export function buildWhatsAppMessage(params: {
  customerName: string
  invoiceNumber: string
  total: string
  pdfUrl?: string
}): string {
  const lines = [
    `Dear ${params.customerName},`,
    "",
    `Your invoice #${params.invoiceNumber}`,
    `Total: ${params.total}`,
  ]
  if (params.pdfUrl) {
    lines.push("", "Download invoice:", params.pdfUrl)
  }
  return lines.join("\n")
}
