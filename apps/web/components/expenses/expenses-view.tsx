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
import type { Expense } from "@/types/database"
import { createExpense, deleteExpense } from "@/lib/actions/expenses"
import { formatCurrency } from "@/lib/utils/finance"
import { PageHeader, AddButton } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DeleteButton } from "@/components/shared/delete-button"

const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Fuel",
  "Salary",
  "Maintenance",
  "Transport",
  "Other",
]

export function ExpensesView({ expenses }: { expenses: Expense[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await createExpense({
      category: fd.get("category") as string,
      description: (fd.get("description") as string) || undefined,
      amount: Number(fd.get("amount")),
      date: (fd.get("date") as string) || undefined,
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
        title="Expenses"
        description="Track business operating costs"
        action={<AddButton onClick={() => setOpen(true)} label="Add Expense" />}
      />

      {expenses.length === 0 ? (
        <EmptyState message="No expenses recorded yet." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.date}</TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell>{e.description ?? "—"}</TableCell>
                <TableCell>{formatCurrency(e.amount)}</TableCell>
                <TableCell>
                  <DeleteButton
                    onDelete={async () => {
                      await deleteExpense(e.id)
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
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Input name="category" list="expense-categories" required />
              <datalist id="expense-categories">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input name="description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Amount *</Label>
                <Input name="amount" type="number" min="0.01" step="0.01" required />
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
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
