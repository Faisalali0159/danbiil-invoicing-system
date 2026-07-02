import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency } from "@/lib/utils/finance"
import { PageHeader } from "@/components/shared/page-header"

type InvoiceDetailItem = {
  id: string
  quantity: number
  selling_price: number
  total: number
  products?: { name?: string | null } | { name?: string | null }[] | null
}

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: invoice, error: invoiceError }, { data: items }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(name, phone, address)")
      .eq("id", id)
      .single(),
    supabase
      .from("invoice_items")
      .select("id, quantity, selling_price, cost_price, total, products(name)")
      .eq("invoice_id", id),
  ])

  if (invoiceError || !invoice) {
    notFound()
  }

  const invoiceItems = (items ?? []) as InvoiceDetailItem[]

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        description="Review invoice details and line items"
        action={
          <div className="flex gap-2">
            <Link href="/invoices">
              <Button type="button" variant="outline" size="sm">
                Back
              </Button>
            </Link>
            <Link href={`/invoices/${invoice.id}/edit`}>
              <Button type="button" variant="outline" size="sm">
                Edit Invoice
              </Button>
            </Link>
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
              <Button type="button" size="sm">
                Open PDF
              </Button>
            </a>
            <a
              href={`/api/invoices/${invoice.id}/pdf?template=receipt`}
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" variant="outline" size="sm">
                Open Receipt
              </Button>
            </a>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-medium">{invoice.customers?.name ?? "Customer"}</p>
          <p className="text-sm text-muted-foreground">{invoice.customers?.phone ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{invoice.customers?.address ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Invoice Date</p>
          <p className="font-medium">{invoice.date}</p>
          <p className="mt-2 text-sm text-muted-foreground">Payment Status</p>
          <Badge variant={invoice.payment_status === "paid" ? "secondary" : "outline"}>
            {invoice.payment_status}
          </Badge>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Paid: {formatCurrency(invoice.paid_amount)}
          </p>
          <p className="text-sm text-muted-foreground">
            Remaining: {formatCurrency(invoice.remaining_balance)}
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Sell Price</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoiceItems.map((item) => {
            const productName = Array.isArray(item.products)
              ? item.products[0]?.name
              : item.products?.name
            return (
              <TableRow key={item.id}>
                <TableCell>{productName ?? "Item"}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.selling_price)}</TableCell>
                <TableCell>{formatCurrency(item.total)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Totals</p>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <p>Subtotal: {formatCurrency(invoice.subtotal)}</p>
          <p>Discount: {formatCurrency(invoice.discount)}</p>
          <p>VAT: {formatCurrency(invoice.vat_amount)}</p>
          <p>Delivery: {formatCurrency(invoice.delivery_cost)}</p>
        </div>
        {invoice.notes && (
          <p className="mt-3 text-sm text-muted-foreground">Notes: {invoice.notes}</p>
        )}
      </div>
    </div>
  )
}
