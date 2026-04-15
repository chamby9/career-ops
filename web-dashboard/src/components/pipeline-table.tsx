"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  ExternalLink,
  PlayCircle,
  Trash2,
  HeartPulse,
  Loader2,
} from "lucide-react";
import type { PipelineItem } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Props = {
  items: PipelineItem[];
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

type RowMenuProps = {
  item: PipelineItem;
  onEvaluate: () => void;
  onDiscard: () => void;
  onLiveness: () => void;
};

function RowMenu({ item, onEvaluate, onDiscard, onLiveness }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onEvaluate();
            }}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
          >
            <PlayCircle className="size-3" />
            <span>Evaluate</span>
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onLiveness();
            }}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
          >
            <HeartPulse className="size-3" />
            <span>Check liveness</span>
          </button>
          <div className="my-1 h-px bg-border" />
          <a
            role="menuitem"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1 hover:bg-accent hover:text-accent-foreground"
          >
            <ExternalLink className="size-3" />
            <span>Open URL</span>
          </a>
          <div className="my-1 h-px bg-border" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onDiscard();
            }}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-rose-400 hover:bg-accent hover:text-accent-foreground"
          >
            <Trash2 className="size-3" />
            <span>Discard</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function PipelineTable({ items }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [livenessResult, setLivenessResult] = useState<string | null>(null);

  const visibleItems = useMemo(() => items, [items]);

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === visibleItems.length ? new Set() : new Set(visibleItems.map((i) => i.url)),
    );
  }

  async function post(path: string, body: unknown): Promise<Response> {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function queueEvaluate(url: string) {
    setBusy("evaluate");
    try {
      const res = await post("/api/jobs", { action: "evaluate", args: { url } });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "queue failed");
      }
      window.alert(`Queued evaluate: ${hostOf(url)}`);
    } catch (err) {
      window.alert(`Evaluate failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function queueBatch() {
    if (selected.size === 0) return;
    setBusy("batch");
    try {
      const res = await post("/api/jobs", { action: "batch", args: {} });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "queue failed");
      }
      window.alert(
        `Queued batch. It will process all pending pipeline URLs (${selected.size} selected ignored — batch mode runs all).`,
      );
      setSelected(new Set());
    } catch (err) {
      window.alert(`Batch failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function queueEvaluateEach() {
    if (selected.size === 0) return;
    setBusy("evaluate-each");
    const urls = Array.from(selected);
    let ok = 0;
    let failed = 0;
    for (const url of urls) {
      try {
        const res = await post("/api/jobs", { action: "evaluate", args: { url } });
        if (res.ok) ok += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(null);
    window.alert(`Queued ${ok} evaluate job(s). Failed: ${failed}.`);
    setSelected(new Set());
  }

  async function discard(urls: string[]) {
    if (urls.length === 0) return;
    const label = urls.length === 1 ? hostOf(urls[0]) : `${urls.length} URLs`;
    if (!window.confirm(`Discard ${label} from pipeline?`)) return;
    setBusy("discard");
    try {
      const res = await post("/api/pipeline/discard", { urls });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "discard failed");
      }
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      window.alert(`Discard failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function liveness(urls: string[]) {
    if (urls.length === 0) return;
    if (urls.length > 10) {
      window.alert("Liveness check runs max 10 URLs at once. Narrow your selection.");
      return;
    }
    setBusy("liveness");
    setLivenessResult(null);
    try {
      const res = await post("/api/pipeline/liveness", { urls });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "liveness failed");
      setLivenessResult(data.stdout?.trim() || "(no output)");
    } catch (err) {
      window.alert(`Liveness failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function scanNow() {
    setBusy("scan");
    try {
      const res = await post("/api/pipeline/scan", {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "scan failed");
      window.alert(
        `Scan complete (${(data.durationMs / 1000).toFixed(1)}s). Refreshing pipeline.`,
      );
      router.refresh();
    } catch (err) {
      window.alert(`Scan failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  const allSelected = selected.size > 0 && selected.size === visibleItems.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={scanNow} disabled={busy !== null}>
          {busy === "scan" ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan now
        </Button>
        {selected.size > 0 && (
          <>
            <span className="mx-1 h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <Button
              size="sm"
              onClick={queueEvaluateEach}
              disabled={busy !== null}
            >
              Evaluate each ({selected.size})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={queueBatch}
              disabled={busy !== null}
              title="Queues /career-ops batch (processes full pipeline.md)"
            >
              Queue batch
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => liveness(Array.from(selected))}
              disabled={busy !== null || selected.size > 10}
            >
              Liveness ({selected.size})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => discard(Array.from(selected))}
              disabled={busy !== null}
            >
              Discard ({selected.size})
            </Button>
          </>
        )}
      </div>

      {livenessResult && (
        <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
          {livenessResult}
        </pre>
      )}

      {visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No pending items. Click &ldquo;Scan now&rdquo; or paste a URL in Claude Code to add one.
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          <div className="flex items-center gap-3 p-2 text-xs text-muted-foreground bg-muted/30">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              aria-label="Select all"
              className="ml-1"
            />
            <span>Select all ({visibleItems.length})</span>
          </div>
          {visibleItems.map((item) => {
            const isSelected = selected.has(item.url);
            const host = hostOf(item.url);
            const title = item.company
              ? `${item.company}${item.role ? ` — ${item.role}` : ""}`
              : item.label ?? host;
            return (
              <div
                key={item.url}
                className="flex items-start gap-3 p-3 hover:bg-accent/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(item.url)}
                  aria-label={`Select ${host}`}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{title}</div>
                  <div className="text-xs text-muted-foreground truncate">{item.url}</div>
                </div>
                <div className="flex-none pt-0.5">
                  <RowMenu
                    item={item}
                    onEvaluate={() => queueEvaluate(item.url)}
                    onDiscard={() => discard([item.url])}
                    onLiveness={() => liveness([item.url])}
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
