"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { ArrowRightLeft } from "lucide-react"
import { convertQuotationToInvoice } from "@/lib/actions/quotations"

export function ConvertQuotationButton({
  quotationId,
  quotationNumber,
  variant = "icon",
  onError,
}: {
  quotationId: string
  quotationNumber: string
  variant?: "icon" | "full"
  onError?: (message: string) => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleConvert() {
    setLoading(true)
    const result = await convertQuotationToInvoice(quotationId)
    setLoading(false)
    if (result.error) {
      onError?.(result.error)
      if (!onError) window.alert(result.error)
      return
    }
    if (result.invoiceId) {
      router.push(`/invoices/${result.invoiceId}`)
    }
    router.refresh()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          variant === "icon" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Convert to Sales Invoice"
            >
              <ArrowRightLeft />
            </Button>
          ) : (
            <Button type="button" size="sm">
              <ArrowRightLeft /> Convert to Invoice
            </Button>
          )
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert to Sales Invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            This creates a sales invoice from quotation {quotationNumber} with
            the same customer, items and payment terms. Stock will be deducted
            and the invoice total added to the customer balance. The quotation
            will be locked as converted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConvert} disabled={loading}>
            {loading ? "Converting..." : "Convert"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
