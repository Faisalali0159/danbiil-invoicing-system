"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import type { QuotationStatus } from "@/types/database"
import { updateQuotationStatus } from "@/lib/actions/quotations"

const EDITABLE_STATUSES: Exclude<QuotationStatus, "converted">[] = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
]

export function QuotationStatusSelect({
  quotationId,
  status,
}: {
  quotationId: string
  status: QuotationStatus
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === "converted") {
    return <span className="text-sm text-muted-foreground">Converted</span>
  }

  async function handleChange(value: string | null) {
    if (!value || value === status) return
    setLoading(true)
    setError(null)
    const result = await updateQuotationStatus(
      quotationId,
      value as Exclude<QuotationStatus, "converted">
    )
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-1">
      <Select value={status} onValueChange={handleChange} disabled={loading}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EDITABLE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
