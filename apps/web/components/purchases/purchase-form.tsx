"use client"

import { useMemo, useState } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Plus, Trash2 } from "lucide-react"
import type { Product, Supplier } from "@/types/database"
import { createPurchase } from "@/lib/actions/purchases"
import { formatCurrency } from "@/lib/utils/finance"
import { onSelectValue } from "@/lib/utils/select"

type LineItem = { product_id: string; quantity: number; cost_price: number }

export function PurchaseForm({
  suppliers,
  products,
}: {
  suppliers: Supplier[]
  products: Product[]
}) {
  const router = useRouter()
  const [supplierId, setSupplierId] = useState("")
  const [paidAmount, setPaidAmount] = useState(0)
  const [items, setItems] = useState<LineItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const total = items.reduce(
    (sum, i) => sum + i.quantity * i.cost_price,
    0
  )

  const productOptions = useMemo(
    () => products.filter((product) => !supplierId || product.supplier_id === supplierId),
    [products, supplierId]
  )

  function addItem() {
    const first = productOptions[0]
    if (!first) return
    setItems([
      ...items,
      {
        product_id: first.id,
        quantity: 1,
        cost_price: first.purchase_price,
      },
    ])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId) {
      setError("Select a supplier")
      return
    }
    if (!items.length) {
      setError("Add at least one product")
      return
    }
    setLoading(true)
    const result = await createPurchase({
      supplier_id: supplierId,
      paid_amount: paidAmount,
      items,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push("/purchases")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Supplier *</Label>
          <Select
            value={supplierId}
            onValueChange={onSelectValue((value) => {
              setSupplierId(value)
              setItems([])
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
          <Label>Paid Amount</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={paidAmount}
            onChange={(e) => setPaidAmount(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-medium">Products</h3>
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          <Plus /> Add Product
        </Button>
      </div>
      {supplierId && productOptions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No products linked to this supplier yet. Add products for this supplier first.
        </p>
      )}

      {items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Select
                    value={item.product_id}
                    onValueChange={onSelectValue((v) => {
                      const p = products.find((x) => x.id === v)
                      setItems(
                        items.map((it, i) =>
                          i === index
                            ? {
                                ...it,
                                product_id: v,
                                cost_price: p?.purchase_price ?? it.cost_price,
                              }
                            : it
                        )
                      )
                    })}
                  >
                    <SelectTrigger className="w-full min-w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    className="w-20"
                    value={item.quantity}
                    onChange={(e) =>
                      setItems(
                        items.map((it, i) =>
                          i === index
                            ? { ...it, quantity: Number(e.target.value) }
                            : it
                        )
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24"
                    value={item.cost_price}
                    onChange={(e) =>
                      setItems(
                        items.map((it, i) =>
                          i === index
                            ? { ...it, cost_price: Number(e.target.value) }
                            : it
                        )
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  {formatCurrency(item.quantity * item.cost_price)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setItems(items.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
        <span className="font-semibold">Total: {formatCurrency(total)}</span>
        <Button type="submit" disabled={loading || !supplierId || items.length === 0}>
          {loading ? "Saving..." : "Create Purchase"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
