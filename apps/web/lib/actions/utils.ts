import { revalidatePath } from "next/cache"

export function revalidateModule(path: string) {
  revalidatePath(path)
}

export function parseNumber(value: string | number | null | undefined, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function todayISO() {
  return new Date().toISOString().split("T")[0]
}
