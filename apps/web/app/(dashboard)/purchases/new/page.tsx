import { createClient } from "@/lib/supabase/server"
import { PurchaseForm } from "@/components/purchases/purchase-form"

export default async function NewPurchasePage() {
  const supabase = await createClient()
  const [suppliers, products] = await Promise.all([
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("products").select("*").order("name"),
  ])

  return (
    <PurchaseForm
      suppliers={suppliers.data ?? []}
      products={products.data ?? []}
    />
  )
}
