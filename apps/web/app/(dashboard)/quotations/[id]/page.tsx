import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
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
import { ConvertQuotationButton } from "@/components/quotations/convert-quotation-button"
import { QuotationStatusSelect } from "@/components/quotations/quotation-status-select"

type QuotationDetailItem = {
  id: string
  quantity: number
  selling_price: number
  total: number
  products?: { name?: string | null } | { name?: string | null }[] | null
}

export default async function QuotationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: quotation, error: quotationError }, { data: items }] =
    await Promise.all([
      supabase
        .from("quotations")
        .select("*, customers(name, phone, address, company_name)")
        .eq("id", id)
        .single(),
      supabase
        .from("quotation_items")
        .select("id, quantity, selling_price, cost_price, total, products(name)")
        .eq("quotation_id", id),
    ])

  if (quotationError || !quotation) {
    notFound()
  }

  const { data: convertedInvoice } = quotation.converted_invoice_id
    ? await supabase
        .from("invoices")
        .select("id, invoice_number")
        .eq("id", quotation.converted_invoice_id)
        .maybeSingle()
    : { data: null }

  const quotationItems = (items ?? []) as QuotationDetailItem[]
  const isConverted = quotation.status === "converted"

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={`Quotation ${quotation.quotation_number}`}
        description="Review quotation details and line items"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/quotations">
              <Button type="button" variant="outline" size="sm">
                Back
              </Button>
            </Link>
            {!isConverted && (
              <Link href={`/quotations/${quotation.id}/edit`}>
                <Button type="button" variant="outline" size="sm">
                  Edit Quotation
                </Button>
              </Link>
            )}
            <a
              href={`/api/quotations/${quotation.id}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" variant="outline" size="sm">
                Open PDF
              </Button>
            </a>
            {!isConverted && quotation.status !== "rejected" && (
              <ConvertQuotationButton
                quotationId={quotation.id}
                quotationNumber={quotation.quotation_number}
                variant="full"
              />
            )}
          </div>
        }
      />

      {convertedInvoice && (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          Converted to sales invoice{" "}
          <Link
            href={`/invoices/${convertedInvoice.id}`}
            className="font-medium underline underline-offset-4"
          >
            {convertedInvoice.invoice_number}
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-medium">
            {quotation.customers?.company_name ??
              quotation.customers?.name ??
              "Customer"}
          </p>
          <p className="text-sm text-muted-foreground">
            {quotation.customers?.phone ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {quotation.customers?.address ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Quotation Date</p>
          <p className="font-medium">{quotation.date}</p>
          <p className="mt-2 text-sm text-muted-foreground">Valid Until</p>
          <p className="font-medium">{quotation.valid_until ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-medium">{formatCurrency(quotation.total_amount)}</p>
          <p className="mt-2 mb-1 text-sm text-muted-foreground">Status</p>
          <QuotationStatusSelect
            quotationId={quotation.id}
            status={quotation.status}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotationItems.map((item) => {
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
          <p>Subtotal: {formatCurrency(quotation.subtotal)}</p>
          <p>Discount: {formatCurrency(quotation.discount)}</p>
          <p>VAT: {formatCurrency(quotation.vat_amount)}</p>
          <p>Delivery: {formatCurrency(quotation.delivery_cost)}</p>
        </div>
        {quotation.payment_terms && (
          <p className="mt-3 text-sm text-muted-foreground">
            Payment Terms: {quotation.payment_terms}
          </p>
        )}
        {quotation.notes && (
          <p className="mt-2 text-sm text-muted-foreground">
            Notes: {quotation.notes}
          </p>
        )}
      </div>
    </div>
  )
}
