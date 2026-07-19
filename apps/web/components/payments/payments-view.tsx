"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import type { Customer, Supplier } from "@/types/database"
import { createPayment, deletePayment } from "@/lib/actions/payments"
import { formatCurrency } from "@/lib/utils/finance"
import { onSelectValue } from "@/lib/utils/select"
import { PageHeader, AddButton } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DeleteButton } from "@/components/shared/delete-button"

type PaymentRow = {
  id: string
  payment_type: string
  amount: number
  payment_date: string
  notes: string | null
  customers?: { name: string; company_name: string | null } | null
  suppliers?: { name: string; company_name: string | null } | null
  invoices?: { invoice_number: string } | null
  purchases?: { invoice_number: string } | null
}

type InvoiceOption = { id: string; invoice_number: string; remaining_balance: number }
type PurchaseOption = { id: string; invoice_number: string; remaining_balance: number }

export function PaymentsView({
  payments,
  customers,
  suppliers,
  invoices,
  purchases,
}: {
  payments: PaymentRow[]
  customers: Customer[]
  suppliers: Supplier[]
  invoices: InvoiceOption[]
  purchases: PurchaseOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [paymentType, setPaymentType] = useState<"customer_payment" | "supplier_payment">("customer_payment")
  const [customerId, setCustomerId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [invoiceId, setInvoiceId] = useState("")
  const [purchaseId, setPurchaseId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await createPayment({
      payment_type: paymentType,
      customer_id: paymentType === "customer_payment" ? customerId : undefined,
      supplier_id: paymentType === "supplier_payment" ? supplierId : undefined,
      invoice_id: invoiceId || undefined,
      purchase_id: purchaseId || undefined,
      amount: Number(fd.get("amount")),
      payment_date: (fd.get("payment_date") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Payments"
        description="Record customer and supplier payments"
        action={<AddButton onClick={() => setOpen(true)} label="Record Payment" />}
      />

      {payments.length === 0 ? (
        <EmptyState message="No payments recorded yet." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.payment_date}</TableCell>
                <TableCell>
                  <Badge variant="outline">{p.payment_type.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  {p.customers?.company_name ??
                    p.customers?.name ??
                    p.suppliers?.company_name ??
                    p.suppliers?.name ??
                    "—"}
                </TableCell>
                <TableCell>
                  {p.invoices?.invoice_number ?? p.purchases?.invoice_number ?? "—"}
                </TableCell>
                <TableCell>{formatCurrency(p.amount)}</TableCell>
                <TableCell>{p.notes ?? "—"}</TableCell>
                <TableCell>
                  <DeleteButton
                    onDelete={async () => {
                      await deletePayment(p.id)
                      router.refresh()
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Payment Type</Label>
              <Select
                value={paymentType}
                onValueChange={(v) =>
                  setPaymentType(v as "customer_payment" | "supplier_payment")
                }
                items={[
                  { value: "customer_payment", label: "Customer Payment" },
                  { value: "supplier_payment", label: "Supplier Payment" },
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_payment">Customer Payment</SelectItem>
                  <SelectItem value="supplier_payment">Supplier Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentType === "customer_payment" ? (
              <>
                <div className="grid gap-2">
                  <Label>Customer *</Label>
                  <Select
                    value={customerId}
                    onValueChange={onSelectValue(setCustomerId)}
                    items={customers.map((c) => ({
                      value: c.id,
                      label: c.company_name || c.name,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company_name || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Link Invoice (optional)</Label>
                  <Select
                    value={invoiceId}
                    onValueChange={onSelectValue(setInvoiceId)}
                    items={invoices.map((inv) => ({
                      value: inv.id,
                      label: inv.invoice_number,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoice_number} ({formatCurrency(inv.remaining_balance)} due)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Supplier *</Label>
                  <Select
                    value={supplierId}
                    onValueChange={onSelectValue(setSupplierId)}
                    items={suppliers.map((s) => ({
                      value: s.id,
                      label: s.company_name || s.name,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.company_name || s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Link Purchase (optional)</Label>
                  <Select
                    value={purchaseId}
                    onValueChange={onSelectValue(setPurchaseId)}
                    items={purchases.map((p) => ({
                      value: p.id,
                      label: p.invoice_number,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select purchase" />
                    </SelectTrigger>
                    <SelectContent>
                      {purchases.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.invoice_number} ({formatCurrency(p.remaining_balance)} due)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Amount *</Label>
                <Input name="amount" type="number" min="0.01" step="0.01" required />
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input name="payment_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Input name="notes" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
