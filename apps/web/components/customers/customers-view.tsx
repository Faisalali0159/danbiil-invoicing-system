"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
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
import { Pencil } from "lucide-react"
import type { Customer } from "@/types/database"
import { createCustomer, updateCustomer, deleteCustomer } from "@/lib/actions/customers"
import { formatCurrency } from "@/lib/utils/finance"
import { PageHeader, AddButton } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DeleteButton } from "@/components/shared/delete-button"

export function CustomersView({ customers }: { customers: Customer[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function openCreate() {
    setEditing(null)
    setError(null)
    setOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditing(customer)
    setError(null)
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const data = {
      name: fd.get("name") as string,
      phone: (fd.get("phone") as string) || undefined,
      address: (fd.get("address") as string) || undefined,
      company_name: (fd.get("company_name") as string) || undefined,
      credit_limit: Number(fd.get("credit_limit") || 0),
    }
    const result = editing
      ? await updateCustomer(editing.id, data)
      : await createCustomer(data)
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
        title="Customers"
        description="Manage customer accounts and credit limits"
        action={<AddButton onClick={openCreate} label="Add Customer" />}
      />

      {customers.length === 0 ? (
        <EmptyState message="No customers yet. Add your first customer." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Credit Limit</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>{c.company_name ?? "—"}</TableCell>
                <TableCell>{formatCurrency(c.credit_limit)}</TableCell>
                <TableCell>{formatCurrency(c.current_balance)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                      <Pencil />
                    </Button>
                    <DeleteButton
                      onDelete={async () => {
                        await deleteCustomer(c.id)
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <form key={editing?.id ?? "new"} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={editing?.name ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company_name">Company</Label>
              <Input id="company_name" name="company_name" defaultValue={editing?.company_name ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={editing?.address ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="credit_limit">Credit Limit</Label>
              <Input id="credit_limit" name="credit_limit" type="number" min="0" step="0.01" defaultValue={editing?.credit_limit ?? 0} />
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
