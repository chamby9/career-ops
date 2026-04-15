import { Suspense } from "react";
import { loadApplications, loadStats } from "@/lib/parsers";
import { StatsStrip } from "@/components/stats-strip";
import { TrackerTable } from "@/components/tracker-table";
import { LiveRefresh } from "@/components/live-refresh";
import { ActionsPanel } from "@/components/actions-panel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [applications, stats] = await Promise.all([loadApplications(), loadStats()]);

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <StatsStrip stats={stats} />
      <ActionsPanel />
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Applications</h2>
          {stats.pipelineCount > 0 && (
            <span className="text-xs text-muted-foreground">{stats.pipelineCount} in pipeline</span>
          )}
        </div>
        <Suspense fallback={null}>
          <TrackerTable applications={applications} />
        </Suspense>
      </section>
    </div>
  );
}
