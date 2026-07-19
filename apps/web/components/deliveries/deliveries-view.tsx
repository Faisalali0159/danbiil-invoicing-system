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
import { createDelivery, updateDeliveryStatus, deleteDelivery } from "@/lib/actions/deliveries"
import { formatCurrency } from "@/lib/utils/finance"
import { onSelectValue } from "@/lib/utils/select"
import { PageHeader, AddButton } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DeleteButton } from "@/components/shared/delete-button"

type DeliveryRow = {
  id: string
  driver_name: string | null
  vehicle: string | null
  cost: number
  status: string
  date: string
  invoices?: { invoice_number: string } | null
}

type InvoiceOption = { id: string; invoice_number: string }

export function DeliveriesView({
  deliveries,
  invoices,
}: {
  deliveries: DeliveryRow[]
  invoices: InvoiceOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [invoiceId, setInvoiceId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!invoiceId) {
      setError("Select an invoice")
      return
    }
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await createDelivery({
      invoice_id: invoiceId,
      driver_name: (fd.get("driver_name") as string) || undefined,
      vehicle: (fd.get("vehicle") as string) || undefined,
      cost: Number(fd.get("cost")),
      status: (fd.get("status") as "pending" | "in_transit" | "delivered") || "pending",
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
        title="Deliveries"
        description="Track delivery costs and status"
        action={<AddButton onClick={() => setOpen(true)} label="Add Delivery" />}
      />

      {deliveries.length === 0 ? (
        <EmptyState message="No deliveries recorded yet." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.invoices?.invoice_number ?? "—"}</TableCell>
                <TableCell>{d.driver_name ?? "—"}</TableCell>
                <TableCell>{d.vehicle ?? "—"}</TableCell>
                <TableCell>{formatCurrency(d.cost)}</TableCell>
                <TableCell>
                  <Select
                    value={d.status}
                    onValueChange={async (status) => {
                      await updateDeliveryStatus(
                        d.id,
                        status as "pending" | "in_transit" | "delivered" | "cancelled"
                      )
                      router.refresh()
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">pending</SelectItem>
                      <SelectItem value="in_transit">in transit</SelectItem>
                      <SelectItem value="delivered">delivered</SelectItem>
                      <SelectItem value="cancelled">cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{d.date}</TableCell>
                <TableCell>
                  <DeleteButton
                    onDelete={async () => {
                      await deleteDelivery(d.id)
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
            <DialogTitle>Add Delivery</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Invoice *</Label>
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
                      {inv.invoice_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Driver</Label>
                <Input name="driver_name" />
              </div>
              <div className="grid gap-2">
                <Label>Vehicle</Label>
                <Input name="vehicle" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cost *</Label>
                <Input name="cost" type="number" min="0" step="0.01" required />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Input name="status" defaultValue="pending" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
