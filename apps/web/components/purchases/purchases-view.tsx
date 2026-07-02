"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { deletePurchase } from "@/lib/actions/purchases"
import { formatCurrency } from "@/lib/utils/finance"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DeleteButton } from "@/components/shared/delete-button"

type PurchaseRow = {
  id: string
  invoice_number: string
  purchase_date: string
  total_amount: number
  paid_amount: number
  remaining_balance: number
  status: string
  suppliers?: { name: string } | null
}

export function PurchasesView({ purchases }: { purchases: PurchaseRow[] }) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Purchases"
        description="Supplier purchase orders and stock intake"
        action={
          <Link href="/purchases/new">
            <Button size="sm">New Purchase</Button>
          </Link>
        }
      />

      {purchases.length === 0 ? (
        <EmptyState message="No purchases yet. Record a supplier purchase." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.invoice_number}</TableCell>
                <TableCell>{p.suppliers?.name ?? "—"}</TableCell>
                <TableCell>{p.purchase_date}</TableCell>
                <TableCell>{formatCurrency(p.total_amount)}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "paid" ? "secondary" : "outline"}>
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DeleteButton
                    onDelete={async () => {
                      await deletePurchase(p.id)
                      router.refresh()
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
