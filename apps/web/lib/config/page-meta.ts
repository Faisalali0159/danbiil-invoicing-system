export const pageMeta: Record<string, { title: string; description?: string }> = {
  "/": {
    title: "Dashboard",
    description: "Business overview and key metrics",
  },
  "/quotations": {
    title: "Quotations",
    description: "Price quotes and proposals",
  },
  "/invoices": {
    title: "Invoices",
    description: "Sales invoices and receipts",
  },
  "/customers": {
    title: "Customers",
    description: "Customer accounts and balances",
  },
  "/products": {
    title: "Products",
    description: "Inventory and pricing",
  },
  "/purchases": {
    title: "Purchases",
    description: "Supplier purchase orders",
  },
  "/borrowed": {
    title: "Borrowed Products",
    description: "Products received on credit",
  },
  "/payments": {
    title: "Payments",
    description: "Customer and supplier payments",
  },
  "/expenses": {
    title: "Expenses",
    description: "Business expense tracking",
  },
  "/deliveries": {
    title: "Deliveries",
    description: "Delivery costs and status",
  },
  "/commissions": {
    title: "Commissions",
    description: "Sales staff commissions",
  },
  "/reports": {
    title: "Reports",
    description: "Financial summaries",
  },
  "/suppliers": {
    title: "Suppliers",
    description: "Supplier accounts",
  },
  "/settings": {
    title: "Settings",
    description: "Company and tax configuration",
  },
}

export function getPageMeta(pathname: string) {
  if (pageMeta[pathname]) return pageMeta[pathname]
  if (pathname.startsWith("/quotations/new"))
    return { title: "New Quotation", description: "Create a price quotation" }
  if (pathname.startsWith("/invoices/new"))
    return { title: "New Invoice", description: "Create a sales invoice" }
  if (pathname.startsWith("/purchases/new"))
    return { title: "New Purchase", description: "Record a supplier purchase" }
  const base = "/" + pathname.split("/").filter(Boolean)[0]
  return pageMeta[base] ?? { title: "Danbiil Distributor" }
}
