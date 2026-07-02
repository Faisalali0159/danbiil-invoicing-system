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
import type { Profile } from "@/types/database"
import {
  createCommission,
  updateCommissionStatus,
  deleteCommission,
} from "@/lib/actions/commissions"
import { formatCurrency } from "@/lib/utils/finance"
import { onSelectValue } from "@/lib/utils/select"
import { PageHeader, AddButton } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DeleteButton } from "@/components/shared/delete-button"

type CommissionRow = {
  id: string
  percentage: number
  amount: number
  status: string
  date: string
  profiles?: { full_name: string } | null
  invoices?: { invoice_number: string } | null
}

type InvoiceOption = { id: string; invoice_number: string; total_amount: number }

export function CommissionsView({
  commissions,
  employees,
  invoices,
}: {
  commissions: CommissionRow[]
  employees: Profile[]
  invoices: InvoiceOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState("")
  const [invoiceId, setInvoiceId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!employeeId || !invoiceId) {
      setError("Select employee and invoice")
      return
    }
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await createCommission({
      employee_id: employeeId,
      invoice_id: invoiceId,
      percentage: Number(fd.get("percentage")),
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
        title="Commissions"
        description="Sales staff commission tracking"
        action={<AddButton onClick={() => setOpen(true)} label="Add Commission" />}
      />

      {commissions.length === 0 ? (
        <EmptyState message="No commissions recorded yet." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.profiles?.full_name ?? "—"}</TableCell>
                <TableCell>{c.invoices?.invoice_number ?? "—"}</TableCell>
                <TableCell>{c.percentage}%</TableCell>
                <TableCell>{formatCurrency(c.amount)}</TableCell>
                <TableCell>
                  <Select
                    value={c.status}
                    onValueChange={async (status) => {
                      await updateCommissionStatus(
                        c.id,
                        status as "pending" | "paid" | "cancelled"
                      )
                      router.refresh()
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">pending</SelectItem>
                      <SelectItem value="paid">paid</SelectItem>
                      <SelectItem value="cancelled">cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{c.date}</TableCell>
                <TableCell>
                  <DeleteButton
                    onDelete={async () => {
                      await deleteCommission(c.id)
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
            <DialogTitle>Add Commission</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Employee *</Label>
              <Select value={employeeId} onValueChange={onSelectValue(setEmployeeId)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Invoice *</Label>
              <Select value={invoiceId} onValueChange={onSelectValue(setInvoiceId)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} ({formatCurrency(inv.total_amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Commission % *</Label>
              <Input name="percentage" type="number" min="0" max="100" step="0.01" required defaultValue={5} />
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
