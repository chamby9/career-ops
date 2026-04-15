import { loadPipeline } from "@/lib/parsers";
import { LiveRefresh } from "@/components/live-refresh";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const items = await loadPipeline();

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <div>
        <h1 className="text-lg font-semibold">Pipeline inbox</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} pending URL{items.length === 1 ? "" : "s"} awaiting evaluation.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No pending items. Paste a URL in Claude Code to add one.
        </div>
      ) : (
        <ul className="rounded-lg border divide-y">
          {items.map((item, i) => {
            const host = (() => {
              try { return new URL(item.url).host; } catch { return item.url; }
            })();
            return (
              <li key={`${item.url}-${i}`}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.label ?? host}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.url}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
