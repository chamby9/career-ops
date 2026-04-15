"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

type Job = {
  id: string;
  action: string;
  args?: Record<string, unknown>;
  status: string;
  enqueuedAt?: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
};

function statusColor(status: string): string {
  switch (status) {
    case "running":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "done":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "failed":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "queued":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function describe(job: Job): string {
  if (job.action === "evaluate") return String(job.args?.url ?? "evaluate");
  if (job.action === "pdf") return `PDF: ${job.args?.company ?? ""}`;
  if (job.action === "scan") return "scan portals";
  return job.action;
}

export function ActionsPanel() {
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch { /* swallow */ }
  }, []);

  useEffect(() => {
    loadJobs();
    const t = setInterval(loadJobs, 3000);
    return () => clearInterval(t);
  }, [loadJobs]);

  async function enqueue(action: string, args: Record<string, unknown> = {}) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, args }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "failed to enqueue");
      } else {
        loadJobs();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onEvaluate(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    await enqueue("evaluate", { url: url.trim() });
    setUrl("");
  }

  return (
    <section className="rounded-lg border p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Actions
        </h2>
      </div>

      <form onSubmit={onEvaluate} className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          inputMode="url"
          placeholder="Paste JD URL to evaluate"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 min-w-0 h-8 rounded-md border bg-background px-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button type="submit" size="sm" disabled={busy || !url.trim()}>
          Evaluate
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => enqueue("scan")}
        >
          Scan portals
        </Button>
      </form>

      {error && (
        <div className="text-xs text-rose-400">{error}</div>
      )}

      {jobs.length > 0 && (
        <div className="flex flex-col gap-1 text-xs">
          <div className="text-muted-foreground">Recent jobs</div>
          <div className="divide-y rounded-md border">
            {jobs.slice(0, 8).map((j) => (
              <div key={j.id} className="flex items-center gap-2 p-2">
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${statusColor(
                    j.status,
                  )}`}
                >
                  {j.status}
                </span>
                <span className="flex-1 truncate">{describe(j)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {(j.finishedAt ?? j.startedAt ?? j.enqueuedAt ?? "").slice(11, 19)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
