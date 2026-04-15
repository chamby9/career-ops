import Link from "next/link";
import { loadReports } from "@/lib/parsers";
import { LiveRefresh } from "@/components/live-refresh";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function scoreColor(v: number | null): string {
  if (v === null) return "text-muted-foreground";
  if (v >= 4) return "text-emerald-400";
  if (v >= 3) return "text-amber-400";
  return "text-rose-400";
}

export default async function ReportsIndex() {
  const reports = await loadReports();

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <h1 className="text-lg font-semibold">All reports</h1>
      {reports.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No reports yet.
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {reports.map((r) => (
            <Link
              key={r.slug}
              href={`/reports/${encodeURIComponent(r.slug)}`}
              className="flex items-start gap-3 p-3 hover:bg-accent/40 transition-colors"
            >
              <div className={`flex-none text-lg font-semibold tabular-nums pt-0.5 ${scoreColor(r.score)}`}>
                {r.score !== null ? r.score.toFixed(1) : "—"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                  {r.date && <span>{r.date}</span>}
                  {r.location && <span>· {r.location}</span>}
                  {r.legitimacy && <Badge variant="outline" className="text-[10px]">{r.legitimacy.split("—")[0].trim()}</Badge>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
