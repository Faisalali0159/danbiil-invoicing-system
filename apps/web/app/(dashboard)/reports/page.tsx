import { getReportData } from "@/lib/data/reports"
import { ReportsView } from "@/components/reports/reports-view"

export default async function ReportsPage() {
  const data = await getReportData()
  return <ReportsView data={data} />
}
