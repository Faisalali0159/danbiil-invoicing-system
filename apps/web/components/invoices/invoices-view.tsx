"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Download, Eye, FileText, MessageCircle, Pencil } from "lucide-react"
import type { Invoice } from "@/types/database"
import { deleteInvoice } from "@/lib/actions/invoices"
import { buildWhatsAppMessage, formatCurrency } from "@/lib/utils/finance"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DeleteButton } from "@/components/shared/delete-button"

type InvoiceRow = Invoice & { customers?: { name: string } | null }

export function InvoicesView({ invoices }: { invoices: InvoiceRow[] }) {
  const router = useRouter()

  const statusColor = (status: string) => {
    if (status === "paid") return "secondary"
    if (status === "partial") return "outline"
    return "destructive"
  }

  function buildPdfUrl(
    invoiceId: string,
    options?: { download?: boolean; template?: "invoice" | "receipt" }
  ) {
    const params = new URLSearchParams()
    if (options?.download) {
      params.set("download", "1")
    }
    if (options?.template === "receipt") {
      params.set("template", "receipt")
    }
    const query = params.toString()
    return `/api/invoices/${invoiceId}/pdf${query ? `?${query}` : ""}`
  }

  function downloadPdf(inv: InvoiceRow) {
    const pdfUrl = buildPdfUrl(inv.id, { download: true, template: "invoice" })
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = `${inv.invoice_number}.pdf`
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function downloadReceipt(inv: InvoiceRow) {
    const pdfUrl = buildPdfUrl(inv.id, { download: true, template: "receipt" })
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = `${inv.invoice_number}-receipt.pdf`
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function shareOnWhatsApp(inv: InvoiceRow) {
    const baseUrl = window.location.origin
    const pdfUrl = `${baseUrl}${buildPdfUrl(inv.id)}`
    const message = buildWhatsAppMessage({
      customerName: inv.customers?.name || "Customer",
      invoiceNumber: inv.invoice_number,
      total: formatCurrency(inv.total_amount),
      pdfUrl,
    })
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
    const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer")
    if (!popup) {
      window.location.href = whatsappUrl
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Invoices"
        description="Sales invoices and payment status"
        action={
          <Link href="/invoices/new">
            <Button size="sm">New Invoice</Button>
          </Link>
        }
      />

      {invoices.length === 0 ? (
        <EmptyState message="No invoices yet. Create your first sales invoice." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead className="w-56">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                <TableCell>{inv.customers?.name ?? "—"}</TableCell>
                <TableCell>{inv.date}</TableCell>
                <TableCell>{formatCurrency(inv.total_amount)}</TableCell>
                <TableCell>{formatCurrency(inv.paid_amount)}</TableCell>
                <TableCell>{formatCurrency(inv.remaining_balance)}</TableCell>
                <TableCell>
                  <Badge variant={statusColor(inv.payment_status)}>
                    {inv.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Link href={`/invoices/${inv.id}`}>
                      <Button type="button" variant="ghost" size="icon-sm" title="View invoice">
                        <Eye />
                      </Button>
                    </Link>
                    <Link href={`/invoices/${inv.id}/edit`}>
                      <Button type="button" variant="ghost" size="icon-sm" title="Edit invoice">
                        <Pencil />
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Download PDF"
                      onClick={() => {
                        downloadPdf(inv)
                      }}
                    >
                      <Download />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Download Receipt"
                      onClick={() => {
                        downloadReceipt(inv)
                      }}
                    >
                      <FileText />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Share on WhatsApp"
                      onClick={() => {
                        shareOnWhatsApp(inv)
                      }}
                    >
                      <MessageCircle />
                    </Button>
                    <DeleteButton
                      onDelete={async () => {
                        await deleteInvoice(inv.id)
                        router.refresh()
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
