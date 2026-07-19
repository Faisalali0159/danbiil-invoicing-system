"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
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
import type { Customer, Product } from "@/types/database"
import { createQuotation, updateQuotation } from "@/lib/actions/quotations"
import { calculateVat, formatCurrency } from "@/lib/utils/finance"
import { onSelectValue } from "@/lib/utils/select"

type LineItem = {
  product_id: string
  quantity: number
  selling_price: number
  cost_price: number
}

type InitialQuotation = {
  id: string
  customer_id: string
  date: string
  valid_until: string | null
  discount: number
  delivery_cost: number
  payment_terms: string | null
  notes: string | null
  items: LineItem[]
}

export function QuotationForm({
  customers,
  products,
  vatPercentage,
  mode = "create",
  initialQuotation,
}: {
  customers: Customer[]
  products: Product[]
  vatPercentage: number
  mode?: "create" | "edit"
  initialQuotation?: InitialQuotation
}) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState(
    initialQuotation?.customer_id ?? ""
  )
  const [date, setDate] = useState(
    initialQuotation?.date ?? new Date().toISOString().split("T")[0]
  )
  const [validUntil, setValidUntil] = useState(
    initialQuotation?.valid_until ?? ""
  )
  const [discount, setDiscount] = useState(initialQuotation?.discount ?? 0)
  const [deliveryCost, setDeliveryCost] = useState(
    initialQuotation?.delivery_cost ?? 0
  )
  const [paymentTerms, setPaymentTerms] = useState(
    initialQuotation?.payment_terms ?? ""
  )
  const [notes, setNotes] = useState(initialQuotation?.notes ?? "")
  const [items, setItems] = useState<LineItem[]>(initialQuotation?.items ?? [])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const subtotal = items.reduce(
    (sum, i) => sum + i.quantity * i.selling_price,
    0
  )
  const afterDiscount = subtotal - discount
  const vatAmount = calculateVat(afterDiscount, vatPercentage)
  const total = afterDiscount + vatAmount + deliveryCost

  function addItem() {
    const first = products[0]
    if (!first) return
    setItems([
      ...items,
      {
        product_id: first.id,
        quantity: 1,
        selling_price: first.selling_price,
        cost_price: first.purchase_price,
      },
    ])
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function onProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    updateItem(index, {
      product_id: productId,
      selling_price: product.selling_price,
      cost_price: product.purchase_price,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) {
      setError("Select a customer")
      return
    }
    if (!items.length) {
      setError("Add at least one product")
      return
    }
    setLoading(true)
    setError(null)
    const payload = {
      customer_id: customerId,
      date,
      valid_until: validUntil || undefined,
      discount,
      vat_percentage: vatPercentage,
      delivery_cost: deliveryCost,
      payment_terms: paymentTerms,
      notes,
      items,
    }
    const result =
      mode === "edit" && initialQuotation
        ? await updateQuotation({
            id: initialQuotation.id,
            ...payload,
          })
        : await createQuotation(payload)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    const createdId = "id" in result ? result.id : undefined
    const quotationId = mode === "edit" ? initialQuotation?.id : createdId
    router.push(quotationId ? `/quotations/${quotationId}` : "/quotations")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Date *</Label>
          <Input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
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
          <Label>Valid Until</Label>
          <Input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-medium">Line Items</h3>
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          <Plus /> Add Product
        </Button>
      </div>

      {items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Price</TableHead>
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
                    onValueChange={onSelectValue((v) => onProductChange(index, v))}
                    items={products.map((p) => ({ value: p.id, label: p.name }))}
                  >
                    <SelectTrigger className="w-full min-w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.quantity} in stock)
                        </SelectItem>
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
                      updateItem(index, { quantity: Number(e.target.value) })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24"
                    value={item.selling_price}
                    onChange={(e) =>
                      updateItem(index, {
                        selling_price: Number(e.target.value),
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  {formatCurrency(item.quantity * item.selling_price)}
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Discount</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <Label>Delivery Cost</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={deliveryCost}
            onChange={(e) => setDeliveryCost(Number(e.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <Label>VAT ({vatPercentage}%)</Label>
          <Input readOnly value={formatCurrency(vatAmount)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Payment Terms</Label>
        <Textarea
          placeholder="e.g. 50% advance, balance on delivery"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
        <div className="text-sm text-muted-foreground">
          Subtotal: {formatCurrency(subtotal)} · Total:{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(total)}
          </span>
        </div>
        <Button type="submit" disabled={loading}>
          {loading
            ? mode === "edit"
              ? "Saving..."
              : "Creating..."
            : mode === "edit"
              ? "Save Changes"
              : "Create Quotation"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
