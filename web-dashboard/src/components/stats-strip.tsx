import type { Stats } from "@/lib/types";
import { Card } from "@/components/ui/card";

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-3 gap-1 rounded-lg">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

export function StatsStrip({ stats }: { stats: Stats }) {
  const applied = stats.byStatus["Applied"] ?? 0;
  const interview = stats.byStatus["Interview"] ?? 0;
  const offer = stats.byStatus["Offer"] ?? 0;
  const avg = stats.averageScore !== null ? stats.averageScore.toFixed(1) : "—";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <Tile label="Total" value={stats.total} />
      <Tile label="Applied" value={applied} />
      <Tile label="Interview" value={interview} />
      <Tile label="Offers" value={offer} />
      <Tile label="Avg score" value={avg} />
    </div>
  );
}
