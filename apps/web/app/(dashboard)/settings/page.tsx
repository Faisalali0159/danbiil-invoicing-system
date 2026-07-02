import { createClient } from "@/lib/supabase/server"
import { SettingsView } from "@/components/settings/settings-view"

export default async function SettingsPage() {
  const supabase = await createClient()
  const [company, tax] = await Promise.all([
    supabase.from("company_settings").select("*").limit(1).maybeSingle(),
    supabase.from("tax_settings").select("*").limit(1).maybeSingle(),
  ])

  return (
    <SettingsView
      company={company.data}
      tax={tax.data}
    />
  )
}
