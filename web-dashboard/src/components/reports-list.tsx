"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReportMeta, LegitimacyTier } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function scoreColor(v: number | null): string {
  if (v === null) return "text-muted-foreground";
  if (v >= 4) return "text-emerald-400";
  if (v >= 3) return "text-amber-400";
  return "text-rose-400";
}

const LEGIT_LABELS: Record<LegitimacyTier, string> = {
  high: "High confidence",
  caution: "Caution",
  other: "Other",
};

const LEGIT_CLASS: Record<LegitimacyTier, string> = {
  high: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  caution: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

type SortKey = "score" | "date" | "archetype";
type SortDir = "asc" | "desc";

function compareReports(a: ReportMeta, b: ReportMeta, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
    case "score": {
      const av = a.score;
      const bv = b.score;
      if (av === null && bv === null) cmp = 0;
      else if (av === null) cmp = 1;
      else if (bv === null) cmp = -1;
      else cmp = av - bv;
      if (cmp === 0) cmp = a.slug.localeCompare(b.slug);
      break;
    }
    case "date":
      cmp = (a.date ?? "").localeCompare(b.date ?? "");
      break;
    case "archetype":
      cmp = (a.archetypeKey ?? "").localeCompare(b.archetypeKey ?? "");
      break;
  }
  return dir === "asc" ? cmp : -cmp;
}

export function ReportsList({ reports }: { reports: ReportMeta[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const sortKey = (params.get("sort") as SortKey) || "score";
  const sortDir = (params.get("dir") as SortDir) || "desc";
  const archetypeFilters = params.getAll("archetype");
  const legitimacyFilters = params.getAll("legit") as LegitimacyTier[];
  const minScore = params.get("min") ? parseFloat(params.get("min")!) : null;
  const query = params.get("q")?.toLowerCase() ?? "";

  const archetypeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reports) {
      if (!r.archetypeKey) continue;
      counts.set(r.archetypeKey, (counts.get(r.archetypeKey) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [reports]);

  const legitimacyOptions = useMemo(() => {
    const counts = new Map<LegitimacyTier, number>();
    for (const r of reports) {
      if (!r.legitimacyTier) continue;
      counts.set(r.legitimacyTier, (counts.get(r.legitimacyTier) ?? 0) + 1);
    }
    return (["high", "caution", "other"] as LegitimacyTier[]).filter((k) => counts.has(k))
      .map((k) => [k, counts.get(k)!] as const);
  }, [reports]);

  const filtered = useMemo(() => {
    const list = reports.filter((r) => {
      if (archetypeFilters.length > 0 && (!r.archetypeKey || !archetypeFilters.includes(r.archetypeKey)))
        return false;
      if (legitimacyFilters.length > 0 && (!r.legitimacyTier || !legitimacyFilters.includes(r.legitimacyTier)))
        return false;
      if (minScore !== null && (r.score === null || r.score < minScore)) return false;
      if (query) {
        const hay = `${r.title} ${r.archetype ?? ""} ${r.legitimacy ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
    return list.sort((a, b) => compareReports(a, b, sortKey, sortDir));
  }, [reports, archetypeFilters, legitimacyFilters, minScore, query, sortKey, sortDir]);

  function updateParams(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    router.replace(`/reports?${next.toString()}`, { scroll: false });
  }

  function toggleArchetype(key: string) {
    updateParams((p) => {
      const current = p.getAll("archetype");
      p.delete("archetype");
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      next.forEach((k) => p.append("archetype", k));
    });
  }

  function toggleLegitimacy(key: LegitimacyTier) {
    updateParams((p) => {
      const current = p.getAll("legit");
      p.delete("legit");
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      next.forEach((k) => p.append("legit", k));
    });
  }

  function setMin(value: string) {
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

  function toggleSort(key: SortKey) {
    updateParams((p) => {
      if (sortKey === key) {
        p.set("dir", sortDir === "asc" ? "desc" : "asc");
      } else {
        p.set("sort", key);
        p.set("dir", key === "archetype" ? "asc" : "desc");
      }
    });
  }

  function clearAll() {
    router.replace("/reports", { scroll: false });
  }

  function toggleSelect(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function compareSelected() {
    if (selected.size < 2) {
      window.alert("Select at least 2 reports to compare.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "ofertas", args: { reports: Array.from(selected) } }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "queue failed");
      }
      window.alert(`Queued comparison of ${selected.size} reports. Check Jobs panel.`);
      setSelected(new Set());
    } catch (err) {
      window.alert(`Compare failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const hasFilters =
    archetypeFilters.length > 0 ||
    legitimacyFilters.length > 0 ||
    minScore !== null ||
    query !== "" ||
    sortKey !== "score" ||
    sortDir !== "desc";
  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "");

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <aside className="md:w-56 flex-none flex flex-col gap-4 text-xs">
        <div>
          <div className="text-muted-foreground uppercase tracking-wide mb-1">Search</div>
          <input
            type="search"
            placeholder="title, archetype…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-7 rounded-md border bg-background px-2 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <div className="text-muted-foreground uppercase tracking-wide mb-1">Min score</div>
          <select
            value={minScore ?? ""}
            onChange={(e) => setMin(e.target.value)}
            className="w-full h-7 rounded-md border bg-background px-2"
          >
            <option value="">Any</option>
            <option value="4">≥ 4.0</option>
            <option value="3.5">≥ 3.5</option>
            <option value="3">≥ 3.0</option>
            <option value="2">≥ 2.0</option>
          </select>
        </div>

        {legitimacyOptions.length > 0 && (
          <div>
            <div className="text-muted-foreground uppercase tracking-wide mb-1">Legitimacy</div>
            <div className="flex flex-col gap-1">
              {legitimacyOptions.map(([key, count]) => {
                const active = legitimacyFilters.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleLegitimacy(key)}
                    className={`flex items-center justify-between rounded-md border px-2 py-1 text-left transition-colors ${
                      active ? LEGIT_CLASS[key] : "text-muted-foreground hover:bg-accent/40"
                    }`}
                  >
                    <span>{LEGIT_LABELS[key]}</span>
                    <span className="tabular-nums text-[10px]">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {archetypeOptions.length > 0 && (
          <div>
            <div className="text-muted-foreground uppercase tracking-wide mb-1">Archetype</div>
            <div className="flex flex-col gap-1">
              {archetypeOptions.map(([key, count]) => {
                const active = archetypeFilters.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleArchetype(key)}
                    className={`flex items-center justify-between rounded-md border px-2 py-1 text-left transition-colors ${
                      active
                        ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                        : "text-muted-foreground hover:bg-accent/40"
                    }`}
                  >
                    <span className="truncate mr-1">{key}</span>
                    <span className="tabular-nums text-[10px]">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Sort:</span>
          {(["score", "date", "archetype"] as SortKey[]).map((k) => (
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
          <span className="text-muted-foreground">
            {filtered.length} of {reports.length}
          </span>
          {hasFilters && (
            <Button variant="ghost" size="xs" onClick={clearAll}>
              Clear
            </Button>
          )}
          {selected.size > 0 && (
            <>
              <span className="mx-1 h-4 w-px bg-border" />
              <span className="text-muted-foreground">{selected.size} selected</span>
              <Button
                size="xs"
                onClick={compareSelected}
                disabled={busy || selected.size < 2}
              >
                Compare ({selected.size})
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
            </>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {reports.length === 0 ? "No reports yet." : "No matches. Try clearing filters."}
          </div>
        ) : (
          <div className="rounded-lg border divide-y">
            {filtered.map((r) => {
              const isSelected = selected.has(r.slug);
              return (
                <div
                  key={r.slug}
                  className="flex items-start gap-3 p-3 hover:bg-accent/40 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(r.slug)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${r.title}`}
                    className="mt-1.5"
                  />
                  <Link
                    href={`/reports/${encodeURIComponent(r.slug)}`}
                    className="flex-1 min-w-0 flex items-start gap-3"
                  >
                    <div
                      className={`flex-none text-lg font-semibold tabular-nums pt-0.5 w-10 text-right ${scoreColor(r.score)}`}
                    >
                      {r.score !== null ? r.score.toFixed(1) : "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        {r.date && <span>{r.date}</span>}
                        {r.archetypeKey && (
                          <Badge variant="outline" className="text-[10px]">
                            {r.archetypeKey}
                          </Badge>
                        )}
                        {r.legitimacyTier && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${LEGIT_CLASS[r.legitimacyTier]}`}
                          >
                            {LEGIT_LABELS[r.legitimacyTier]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
