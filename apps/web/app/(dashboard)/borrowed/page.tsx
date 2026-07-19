import { createClient } from "@/lib/supabase/server"
import { BorrowedView } from "@/components/borrowed/borrowed-view"

export default async function BorrowedPage() {
  const supabase = await createClient()
  const [borrowed, suppliers, products] = await Promise.all([
    supabase
      .from("borrowed_products")
      .select("*, suppliers(name, company_name), products(name)")
      .order("borrow_date", { ascending: false }),
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("products").select("*").order("name"),
  ])

  return (
    <BorrowedView
      items={borrowed.data ?? []}
      suppliers={suppliers.data ?? []}
      products={products.data ?? []}
    />
  )
}
