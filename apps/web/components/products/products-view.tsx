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
import { Pencil } from "lucide-react"
import type { Category, Product, Supplier } from "@/types/database"
import { createProduct, updateProduct, deleteProduct } from "@/lib/actions/products"
import { createCategory } from "@/lib/actions/categories"
import { formatCurrency } from "@/lib/utils/finance"
import { onSelectValue } from "@/lib/utils/select"
import { PageHeader, AddButton } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DeleteButton } from "@/components/shared/delete-button"

export function ProductsView({
  products,
  categories,
  suppliers,
  productSourceById,
}: {
  products: (Product & { suppliers?: { name: string; company_name: string | null } | null })[]
  categories: Category[]
  suppliers: Supplier[]
  productSourceById: Record<string, "purchased" | "borrowed" | "both" | "manual">
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [categoryId, setCategoryId] = useState<string>("")
  const [supplierId, setSupplierId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function resetForm(p?: Product | null) {
    setEditing(p ?? null)
    setCategoryId(p?.category_id ?? "")
    setSupplierId(p?.supplier_id ?? "")
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const data = {
      name: fd.get("name") as string,
      category_id: categoryId || undefined,
      barcode: (fd.get("barcode") as string) || undefined,
      purchase_price: Number(fd.get("purchase_price") || 0),
      selling_price: Number(fd.get("selling_price") || 0),
      quantity: Number(fd.get("quantity") || 0),
      min_stock_alert: Number(fd.get("min_stock_alert") || 0),
      unit: (fd.get("unit") as string) || "pcs",
      supplier_id: supplierId || undefined,
    }
    const result = editing
      ? await updateProduct(editing.id, data)
      : await createProduct(data)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  async function handleCategorySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const result = await createCategory(fd.get("name") as string)
    if (result.error) {
      setError(result.error)
      return
    }
    setCatOpen(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Products"
        description="Inventory, pricing, and stock levels"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCatOpen(true)}>
              Add Category
            </Button>
            <AddButton
              onClick={() => {
                resetForm(null)
                setOpen(true)
              }}
              label="Add Product"
            />
          </div>
        }
      />

      {products.length === 0 ? (
        <EmptyState message="No products yet. Add categories and products to start." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Buy</TableHead>
              <TableHead>Sell</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const lowStock = p.quantity <= p.min_stock_alert
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    {p.suppliers?.company_name ?? p.suppliers?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {productSourceById[p.id] === "both"
                        ? "Purchased + Borrowed"
                        : productSourceById[p.id] === "purchased"
                          ? "Purchased"
                          : productSourceById[p.id] === "borrowed"
                            ? "Borrowed"
                            : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell>{formatCurrency(p.purchase_price)}</TableCell>
                  <TableCell>{formatCurrency(p.selling_price)}</TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell>
                    {lowStock ? (
                      <Badge variant="destructive">Low stock</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          resetForm(p)
                          setOpen(true)
                        }}
                      >
                        <Pencil />
                      </Button>
                      <DeleteButton
                        onDelete={async () => {
                          await deleteProduct(p.id)
                          router.refresh()
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <form key={editing?.id ?? "new"} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input name="name" required defaultValue={editing?.name ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={categoryId}
                onValueChange={onSelectValue(setCategoryId)}
                items={categories.map((c) => ({ value: c.id, label: c.name }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <SelectTrigger>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Purchase Price</Label>
                <Input name="purchase_price" type="number" min="0" step="0.01" defaultValue={editing?.purchase_price ?? 0} />
              </div>
              <div className="grid gap-2">
                <Label>Selling Price</Label>
                <Input name="selling_price" type="number" min="0" step="0.01" defaultValue={editing?.selling_price ?? 0} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input name="quantity" type="number" min="0" defaultValue={editing?.quantity ?? 0} />
              </div>
              <div className="grid gap-2">
                <Label>Min Stock Alert</Label>
                <Input name="min_stock_alert" type="number" min="0" defaultValue={editing?.min_stock_alert ?? 0} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Input name="unit" defaultValue={editing?.unit ?? "pcs"} />
              </div>
              <div className="grid gap-2">
                <Label>Barcode</Label>
                <Input name="barcode" defaultValue={editing?.barcode ?? ""} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={loading || !supplierId}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Category Name</Label>
              <Input name="name" required />
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
