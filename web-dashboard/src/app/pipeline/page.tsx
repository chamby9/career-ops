import { loadPipeline, loadScanHistory } from "@/lib/parsers";
import { LiveRefresh } from "@/components/live-refresh";
import { PipelineTable } from "@/components/pipeline-table";
import { ScanHistoryPanel } from "@/components/scan-history";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [items, history] = await Promise.all([loadPipeline(), loadScanHistory()]);

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <div>
        <h1 className="text-lg font-semibold">Pipeline inbox</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} pending URL{items.length === 1 ? "" : "s"} awaiting evaluation.
        </p>
      </div>

      <PipelineTable items={items} />

      <ScanHistoryPanel history={history} />
    </div>
  );
}
