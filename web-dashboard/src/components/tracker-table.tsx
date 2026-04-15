"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Application } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RowActions, type CanonicalStatus } from "@/components/row-actions";

const statusVariants: Record<string, string> = {
  Evaluated: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Applied: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Responded: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Interview: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Offer: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Discarded: "bg-muted text-muted-foreground border-border",
  SKIP: "bg-muted text-muted-foreground border-border",
};

function scoreColor(v: number | null): string {
  if (v === null) return "text-muted-foreground";
  if (v >= 4) return "text-emerald-400";
  if (v >= 3) return "text-amber-400";
  return "text-rose-400";
}

type SortKey = "score" | "date" | "company" | "status" | "num";
type SortDir = "asc" | "desc";

const DEFAULT_SORT: SortKey = "score";
const DEFAULT_DIR: SortDir = "desc";

function compare(a: Application, b: Application, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
    case "score": {
      const av = a.scoreValue;
      const bv = b.scoreValue;
      if (av === null && bv === null) cmp = 0;
      else if (av === null) cmp = 1;
      else if (bv === null) cmp = -1;
      else cmp = av - bv;
      if (cmp === 0) cmp = a.num - b.num;
      break;
    }
    case "date":
      cmp = a.date.localeCompare(b.date);
      if (cmp === 0) cmp = a.num - b.num;
      break;
    case "company":
      cmp = a.company.localeCompare(b.company);
      break;
    case "status":
      cmp = a.status.localeCompare(b.status);
      break;
    case "num":
      cmp = a.num - b.num;
      break;
  }
  return dir === "asc" ? cmp : -cmp;
}

export function TrackerTable({ applications }: { applications: Application[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const sortKey = (params.get("sort") as SortKey) || DEFAULT_SORT;
  const sortDir = (params.get("dir") as SortDir) || DEFAULT_DIR;
  const statusFilters = params.getAll("status");
  const minScore = params.get("min") ? parseFloat(params.get("min")!) : null;
  const query = params.get("q")?.toLowerCase() ?? "";

  const [statusOverrides, setStatusOverrides] = useState<Record<number, string>>({});

  const effective = useMemo(
    () =>
      applications.map((a) =>
        statusOverrides[a.num] ? { ...a, status: statusOverrides[a.num] } : a,
      ),
    [applications, statusOverrides],
  );

  const allStatuses = useMemo(() => {
    const set = new Set<string>();
    effective.forEach((a) => set.add(a.status));
    return Array.from(set).sort();
  }, [effective]);

  async function changeStatus(num: number, status: CanonicalStatus, previous: string) {
    setStatusOverrides((prev) => ({ ...prev, [num]: status }));
    try {
      const res = await fetch(`/api/tracker/${num}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "request failed");
      }
      router.refresh();
    } catch (err) {
      setStatusOverrides((prev) => ({ ...prev, [num]: previous }));
      const msg = err instanceof Error ? err.message : "Failed to update status";
      if (typeof window !== "undefined") window.alert(`Status change failed: ${msg}`);
    }
  }

  async function queueJob(action: string, args: Record<string, unknown>, label: string) {
    try {
      const res = await fetch(`/api/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, args }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "request failed");
      }
      if (typeof window !== "undefined") {
        window.alert(`Queued: ${label}. Check Jobs panel for progress.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Queue failed";
      if (typeof window !== "undefined") window.alert(`${label} failed to queue: ${msg}`);
    }
  }

  const filtered = useMemo(() => {
    const list = effective.filter((a) => {
      if (statusFilters.length > 0 && !statusFilters.includes(a.status)) return false;
      if (minScore !== null && (a.scoreValue === null || a.scoreValue < minScore)) return false;
      if (query && !`${a.company} ${a.role} ${a.notes}`.toLowerCase().includes(query)) return false;
      return true;
    });
    return list.sort((a, b) => compare(a, b, sortKey, sortDir));
  }, [effective, statusFilters, minScore, query, sortKey, sortDir]);

  function updateParams(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    router.replace(`/?${next.toString()}`, { scroll: false });
  }

  function toggleSort(key: SortKey) {
    updateParams((p) => {
      if (sortKey === key) {
        p.set("dir", sortDir === "asc" ? "desc" : "asc");
      } else {
        p.set("sort", key);
        p.set("dir", key === "company" || key === "status" ? "asc" : "desc");
      }
    });
  }

  function toggleStatus(status: string) {
    updateParams((p) => {
      const current = p.getAll("status");
      p.delete("status");
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      next.forEach((s) => p.append("status", s));
    });
  }

  function setMinScore(value: string) {
    updateParams((p) => {
      if (value) p.set("min", value);
      else p.delete("min");
    });
  }

  function setQuery(value: string) {
    updateParams((p) => {
      if (value) p.set("q", value);
      else p.delete("q");
    });
  }

  function clearAll() {
    router.replace("/", { scroll: false });
  }

  const hasFilters = statusFilters.length > 0 || minScore !== null || query !== "";
  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Sort:</span>
        {(["score", "date", "company", "status"] as SortKey[]).map((k) => (
          <Button
            key={k}
            variant={sortKey === k ? "secondary" : "ghost"}
            size="xs"
            onClick={() => toggleSort(k)}
          >
            {k} {sortArrow(k)}
          </Button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <input
          type="search"
          placeholder="Search company, role, notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-6 rounded-md border bg-background px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          value={minScore ?? ""}
          onChange={(e) => setMinScore(e.target.value)}
          className="h-6 rounded-md border bg-background px-2 text-xs"
        >
          <option value="">Any score</option>
          <option value="4">≥ 4.0</option>
          <option value="3.5">≥ 3.5</option>
          <option value="3">≥ 3.0</option>
          <option value="2">≥ 2.0</option>
        </select>
        {hasFilters && (
          <Button variant="ghost" size="xs" onClick={clearAll}>
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-muted-foreground mr-1">Status:</span>
        {allStatuses.map((s) => {
          const active = statusFilters.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={`rounded-md border px-2 py-0.5 transition-colors ${
                active
                  ? statusVariants[s] ?? "bg-muted text-muted-foreground border-border"
                  : "text-muted-foreground hover:bg-accent/40"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} of {applications.length}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {applications.length === 0
            ? "No applications yet. Paste a JD URL in Claude Code to evaluate one."
            : "No matches. Try clearing filters."}
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {filtered.map((a) => {
            const statusClass =
              statusVariants[a.status] ?? "bg-muted text-muted-foreground border-border";
            const content = (
              <div className="flex-1 min-w-0 flex items-start gap-3">
                <div className="flex-none w-8 text-xs text-muted-foreground tabular-nums pt-0.5">
                  #{a.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{a.company}</span>
                    <Badge variant="outline" className={statusClass}>
                      {a.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{a.role}</div>
                  {a.notes && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.notes}</div>
                  )}
                </div>
                <div className="flex-none text-right">
                  <div
                    className={`text-lg font-semibold tabular-nums ${scoreColor(a.scoreValue)}`}
                  >
                    {a.scoreValue !== null ? a.scoreValue.toFixed(1) : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {a.date}
                  </div>
                </div>
              </div>
            );

            return (
              <div
                key={a.num}
                className="flex items-start gap-2 p-3 hover:bg-accent/40 transition-colors"
              >
                {a.reportSlug ? (
                  <Link
                    href={`/reports/${encodeURIComponent(a.reportSlug)}`}
                    className="flex-1 min-w-0 flex"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
                <div className="flex-none pt-0.5">
                  <RowActions
                    num={a.num}
                    company={a.company}
                    role={a.role}
                    currentStatus={a.status}
                    reportSlug={a.reportSlug}
                    jdUrl={a.jdUrl}
                    onStatusChange={(s) => changeStatus(a.num, s, a.status)}
                    onQueueJob={queueJob}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
