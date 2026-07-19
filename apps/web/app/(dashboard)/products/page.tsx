import { createClient } from "@/lib/supabase/server"
import { ProductsView } from "@/components/products/products-view"

export default async function ProductsPage() {
  const supabase = await createClient()
  const [products, categories, suppliers, purchaseItems, borrowedItems] = await Promise.all([
    supabase.from("products").select("*, suppliers(name, company_name)").order("name"),
    supabase.from("categories").select("*").order("name"),
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("purchase_items").select("product_id"),
    supabase.from("borrowed_products").select("product_id"),
  ])

  const purchasedIds = new Set((purchaseItems.data ?? []).map((item) => item.product_id))
  const borrowedIds = new Set((borrowedItems.data ?? []).map((item) => item.product_id))

  const productSourceById: Record<string, "purchased" | "borrowed" | "both" | "manual"> = {}
  for (const product of products.data ?? []) {
    const isPurchased = purchasedIds.has(product.id)
    const isBorrowed = borrowedIds.has(product.id)
    productSourceById[product.id] =
      isPurchased && isBorrowed
        ? "both"
        : isPurchased
          ? "purchased"
          : isBorrowed
            ? "borrowed"
            : "manual"
  }

  return (
    <ProductsView
      products={products.data ?? []}
      categories={categories.data ?? []}
      suppliers={suppliers.data ?? []}
      productSourceById={productSourceById}
    />
  )
}
