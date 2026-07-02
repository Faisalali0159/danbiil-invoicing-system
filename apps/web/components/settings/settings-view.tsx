"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { updateCompanySettings, updateTaxSettings } from "@/lib/actions/settings"
import { PageHeader } from "@/components/shared/page-header"

type CompanySettings = {
  id: string
  company_name: string
  tax_number: string | null
  address: string | null
  phone: string | null
  email: string | null
  currency: string
}

type TaxSettings = {
  id: string
  tax_name: string
  percentage: number
  active: boolean
}

export function SettingsView({
  company,
  tax,
}: {
  company: CompanySettings | null
  tax: TaxSettings | null
}) {
  const router = useRouter()
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [taxError, setTaxError] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [companyForm, setCompanyForm] = useState({
    company_name: company?.company_name ?? "",
    tax_number: company?.tax_number ?? "",
    address: company?.address ?? "",
    phone: company?.phone ?? "",
    email: company?.email ?? "",
    currency: company?.currency ?? "USD",
  })
  const [taxForm, setTaxForm] = useState({
    tax_name: tax?.tax_name ?? "VAT",
    percentage: String(tax?.percentage ?? 0),
    active: tax?.active ?? true,
  })

  useEffect(() => {
    setCompanyForm({
      company_name: company?.company_name ?? "",
      tax_number: company?.tax_number ?? "",
      address: company?.address ?? "",
      phone: company?.phone ?? "",
      email: company?.email ?? "",
      currency: company?.currency ?? "USD",
    })
  }, [company])

  useEffect(() => {
    setTaxForm({
      tax_name: tax?.tax_name ?? "VAT",
      percentage: String(tax?.percentage ?? 0),
      active: tax?.active ?? true,
    })
  }, [tax])

  async function handleCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading("company")
    setCompanyError(null)
    const result = await updateCompanySettings({
      id: company?.id,
      company_name: companyForm.company_name,
      tax_number: companyForm.tax_number || undefined,
      address: companyForm.address || undefined,
      phone: companyForm.phone || undefined,
      email: companyForm.email || undefined,
      currency: companyForm.currency || "USD",
    })
    setLoading(null)
    if (result.error) setCompanyError(result.error)
    else router.refresh()
  }

  async function handleTax(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading("tax")
    setTaxError(null)
    const result = await updateTaxSettings({
      id: tax?.id,
      tax_name: taxForm.tax_name,
      percentage: Number(taxForm.percentage),
      active: taxForm.active,
    })
    setLoading(null)
    if (result.error) setTaxError(result.error)
    else router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Settings"
        description="Company information and tax configuration"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Shown on invoices and reports</CardDescription>
          </CardHeader>
          <CardContent>
            <form key={company?.id ?? "new-co"} onSubmit={handleCompany} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label>Company Name *</Label>
                <Input
                  name="company_name"
                  required
                  value={companyForm.company_name}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      company_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Tax Number</Label>
                <Input
                  name="tax_number"
                  value={companyForm.tax_number}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      tax_number: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input
                  name="address"
                  value={companyForm.address}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    name="phone"
                    value={companyForm.phone}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    name="email"
                    type="email"
                    value={companyForm.email}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Input
                  name="currency"
                  value={companyForm.currency}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      currency: e.target.value,
                    }))
                  }
                />
              </div>
              {companyError && <p className="text-sm text-destructive">{companyError}</p>}
              <Button type="submit" disabled={loading === "company"}>
                {loading === "company" ? "Saving..." : "Save Company"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax / VAT</CardTitle>
            <CardDescription>Applied to new invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <form key={tax?.id ?? "new-tax"} onSubmit={handleTax} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label>Tax Name</Label>
                <Input
                  name="tax_name"
                  value={taxForm.tax_name}
                  onChange={(e) =>
                    setTaxForm((prev) => ({
                      ...prev,
                      tax_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Percentage (%)</Label>
                <Input
                  name="percentage"
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxForm.percentage}
                  onChange={(e) =>
                    setTaxForm((prev) => ({
                      ...prev,
                      percentage: e.target.value,
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="active"
                  type="checkbox"
                  checked={taxForm.active}
                  onChange={(e) =>
                    setTaxForm((prev) => ({
                      ...prev,
                      active: e.target.checked,
                    }))
                  }
                />
                Active
              </label>
              {taxError && <p className="text-sm text-destructive">{taxError}</p>}
              <Button type="submit" disabled={loading === "tax"}>
                {loading === "tax" ? "Saving..." : "Save Tax Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
