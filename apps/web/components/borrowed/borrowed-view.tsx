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
import type { Product, Supplier } from "@/types/database"
import { createBorrowed, deleteBorrowed } from "@/lib/actions/borrowed"
import { formatCurrency } from "@/lib/utils/finance"
import { onSelectValue } from "@/lib/utils/select"
import { PageHeader, AddButton } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DeleteButton } from "@/components/shared/delete-button"

type BorrowedRow = {
  id: string
  quantity: number
  cost: number
  borrow_date: string
  due_date: string | null
  payment_status: string
  paid_amount: number
  suppliers?: { name: string } | null
  products?: { name: string } | null
}

export function BorrowedView({
  items,
  suppliers,
  products,
}: {
  items: BorrowedRow[]
  suppliers: Supplier[]
  products: Product[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState("")
  const [productId, setProductId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supplierProducts = products.filter((product) =>
    supplierId ? product.supplier_id === supplierId : true
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await createBorrowed({
      supplier_id: supplierId,
      product_id: productId,
      quantity: Number(fd.get("quantity")),
      cost: Number(fd.get("cost")),
      due_date: (fd.get("due_date") as string) || undefined,
      paid_amount: Number(fd.get("paid_amount") || 0),
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
        title="Borrowed Products"
        description="Products received from suppliers on credit"
        action={<AddButton onClick={() => setOpen(true)} label="Add Borrowed" />}
      />

      {items.length === 0 ? (
        <EmptyState message="No borrowed products recorded." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.suppliers?.name ?? "—"}</TableCell>
                <TableCell>{row.products?.name ?? "—"}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{formatCurrency(row.cost)}</TableCell>
                <TableCell>{row.due_date ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.payment_status}</Badge>
                </TableCell>
                <TableCell>
                  <DeleteButton
                    onDelete={async () => {
                      await deleteBorrowed(row.id)
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
            <DialogTitle>Record Borrowed Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Supplier *</Label>
              <Select
                value={supplierId}
                onValueChange={onSelectValue((value) => {
                  setSupplierId(value)
                  setProductId("")
                })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Product *</Label>
              <Select value={productId} onValueChange={onSelectValue(setProductId)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {supplierProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {supplierId && supplierProducts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No products linked to this supplier yet. Add product with this supplier first.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input name="quantity" type="number" min="1" required defaultValue={1} />
              </div>
              <div className="grid gap-2">
                <Label>Total Cost</Label>
                <Input name="cost" type="number" min="0" step="0.01" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input name="due_date" type="date" />
              </div>
              <div className="grid gap-2">
                <Label>Paid Amount</Label>
                <Input name="paid_amount" type="number" min="0" step="0.01" defaultValue={0} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                type="submit"
                disabled={loading || !supplierId || !productId || supplierProducts.length === 0}
              >
                {loading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
