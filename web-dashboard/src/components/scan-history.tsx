import type { ScanHistory as ScanHistoryT, ScanRun } from "@/lib/types";

function PortalBreakdown({ run }: { run: ScanRun }) {
  const portals = Object.entries(run.byPortal).sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex flex-wrap gap-1">
      {portals.map(([portal, count]) => (
        <span
          key={portal}
          className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px]"
        >
          <span className="text-muted-foreground">{portal}</span>
          <span className="ml-1 font-medium tabular-nums">{count}</span>
        </span>
      ))}
    </div>
  );
}

export function ScanHistoryPanel({ history }: { history: ScanHistoryT }) {
  if (history.runs.length === 0) {
    return (
      <section className="rounded-lg border p-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Scan history
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          No scans recorded yet. Click &ldquo;Scan now&rdquo; above.
        </p>
      </section>
    );
  }

  const lastRun = history.lastRun!;

  return (
    <section className="rounded-lg border p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Scan history
        </h2>
        <span className="text-xs text-muted-foreground">
          last run: {lastRun.date} · {lastRun.total} new URL{lastRun.total === 1 ? "" : "s"}
        </span>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1">Last run by portal</div>
        <PortalBreakdown run={lastRun} />
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1">Recent runs</div>
        <div className="rounded-md border divide-y">
          {history.runs.slice(0, 10).map((run) => (
            <div key={run.date} className="flex items-center gap-3 p-2 text-xs">
              <span className="tabular-nums text-muted-foreground w-24">{run.date}</span>
              <span className="tabular-nums font-medium w-10">{run.total}</span>
              <div className="flex-1 min-w-0">
                <PortalBreakdown run={run} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
