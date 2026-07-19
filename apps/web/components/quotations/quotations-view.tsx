"use client"

import { useState } from "react"
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
import { Download, Eye, MessageCircle, Pencil } from "lucide-react"
import type { Quotation, QuotationStatus } from "@/types/database"
import { deleteQuotation } from "@/lib/actions/quotations"
import { formatCurrency } from "@/lib/utils/finance"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DeleteButton } from "@/components/shared/delete-button"
import { ConvertQuotationButton } from "./convert-quotation-button"

type QuotationRow = Quotation & { customers?: { name: string } | null }

const STATUS_BADGE: Record<
  QuotationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  sent: "default",
  accepted: "secondary",
  rejected: "destructive",
  expired: "destructive",
  converted: "secondary",
}

export function QuotationsView({ quotations }: { quotations: QuotationRow[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  function downloadPdf(q: QuotationRow) {
    const link = document.createElement("a")
    link.href = `/api/quotations/${q.id}/pdf?download=1`
    link.download = `${q.quotation_number}.pdf`
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function shareOnWhatsApp(q: QuotationRow) {
    const baseUrl = window.location.origin
    const pdfUrl = `${baseUrl}/api/quotations/${q.id}/pdf`
    const lines = [
      `Dear ${q.customers?.name || "Customer"},`,
      "",
      `Your quotation #${q.quotation_number}`,
      `Total: ${formatCurrency(q.total_amount)}`,
      ...(q.valid_until ? [`Valid until: ${q.valid_until}`] : []),
      "",
      "Download quotation:",
      pdfUrl,
    ]
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join("\n"))}`
    const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer")
    if (!popup) {
      window.location.href = whatsappUrl
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Quotations"
        description="Price quotes you can convert into sales invoices"
        action={
          <Link href="/quotations/new">
            <Button size="sm">New Quotation</Button>
          </Link>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {quotations.length === 0 ? (
        <EmptyState message="No quotations yet. Create your first quotation." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-56">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">
                  {q.quotation_number}
                </TableCell>
                <TableCell>{q.customers?.name ?? "—"}</TableCell>
                <TableCell>{q.date}</TableCell>
                <TableCell>{q.valid_until ?? "—"}</TableCell>
                <TableCell>{formatCurrency(q.total_amount)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[q.status] ?? "outline"}>
                    {q.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Link href={`/quotations/${q.id}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="View quotation"
                      >
                        <Eye />
                      </Button>
                    </Link>
                    {q.status !== "converted" && (
                      <Link href={`/quotations/${q.id}/edit`}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Edit quotation"
                        >
                          <Pencil />
                        </Button>
                      </Link>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Download PDF"
                      onClick={() => {
                        downloadPdf(q)
                      }}
                    >
                      <Download />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Share on WhatsApp"
                      onClick={() => {
                        shareOnWhatsApp(q)
                      }}
                    >
                      <MessageCircle />
                    </Button>
                    {q.status !== "converted" && q.status !== "rejected" && (
                      <ConvertQuotationButton
                        quotationId={q.id}
                        quotationNumber={q.quotation_number}
                        onError={setError}
                      />
                    )}
                    <DeleteButton
                      onDelete={async () => {
                        await deleteQuotation(q.id)
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
