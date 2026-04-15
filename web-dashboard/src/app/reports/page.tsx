import { loadReports } from "@/lib/parsers";
import { LiveRefresh } from "@/components/live-refresh";
import { ReportsList } from "@/components/reports-list";

export const dynamic = "force-dynamic";

export default async function ReportsIndex() {
  const reports = await loadReports();

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <h1 className="text-lg font-semibold">All reports</h1>
      <ReportsList reports={reports} />
    </div>
  );
}
