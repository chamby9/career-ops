"use client";

import { useEffect, useRef, useState } from "react";
import {
  MoreVertical,
  ExternalLink,
  FileText,
  Check,
  RefreshCcw,
  FileDown,
  MessageSquare,
  Search,
  Telescope,
  SendHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const CANONICAL_STATUSES = [
  "Evaluated",
  "Applied",
  "Responded",
  "Interview",
  "Offer",
  "Rejected",
  "Discarded",
  "SKIP",
] as const;

export type CanonicalStatus = (typeof CANONICAL_STATUSES)[number];

type QueuedAction =
  | { key: "re-evaluate"; label: "Re-evaluate"; action: "evaluate"; icon: typeof RefreshCcw }
  | { key: "pdf"; label: "Generate PDF"; action: "pdf"; icon: typeof FileDown }
  | { key: "interview-prep"; label: "Interview prep"; action: "interview-prep"; icon: typeof MessageSquare }
  | { key: "contacto"; label: "LinkedIn contacts"; action: "contacto"; icon: typeof Search }
  | { key: "deep"; label: "Deep research"; action: "deep"; icon: typeof Telescope }
  | { key: "apply"; label: "Help apply"; action: "apply"; icon: typeof SendHorizontal };

type Props = {
  num: number;
  company: string;
  role: string;
  currentStatus: string;
  reportSlug: string | null;
  jdUrl: string | null;
  onStatusChange: (status: CanonicalStatus) => void;
  onQueueJob: (action: string, args: Record<string, unknown>, label: string) => void;
};

export function RowActions({
  num,
  company,
  role,
  currentStatus,
  reportSlug,
  jdUrl,
  onStatusChange,
  onQueueJob,
}: Props) {
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

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  const queued: QueuedAction[] = [
    ...(jdUrl ? [{ key: "re-evaluate", label: "Re-evaluate", action: "evaluate", icon: RefreshCcw }] as const : []),
    { key: "pdf", label: "Generate PDF", action: "pdf", icon: FileDown },
    { key: "interview-prep", label: "Interview prep", action: "interview-prep", icon: MessageSquare },
    { key: "contacto", label: "LinkedIn contacts", action: "contacto", icon: Search },
    { key: "deep", label: "Deep research", action: "deep", icon: Telescope },
    ...(jdUrl ? [{ key: "apply", label: "Help apply", action: "apply", icon: SendHorizontal }] as const : []),
  ];

  function argsFor(action: string): Record<string, unknown> {
    switch (action) {
      case "evaluate":
      case "apply":
        return { url: jdUrl };
      case "pdf":
      case "deep":
        return { company };
      case "interview-prep":
      case "contacto":
        return { company, role };
      default:
        return {};
    }
  }

  return (
    <div ref={rootRef} className="relative" onClick={stop}>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Actions for #${num}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
      >
        <MoreVertical />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Set status
          </div>
          {CANONICAL_STATUSES.map((s) => {
            const active = s === currentStatus;
            return (
              <button
                key={s}
                role="menuitem"
                type="button"
                onClick={(e) => {
                  stop(e);
                  setOpen(false);
                  if (!active) onStatusChange(s);
                }}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
              >
                <span>{s}</span>
                {active && <Check className="size-3 text-muted-foreground" />}
              </button>
            );
          })}

          <div className="my-1 h-px bg-border" />
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Queue action
          </div>
          {queued.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.key}
                role="menuitem"
                type="button"
                onClick={(e) => {
                  stop(e);
                  setOpen(false);
                  onQueueJob(q.action, argsFor(q.action), q.label);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="size-3" />
                <span>{q.label}</span>
              </button>
            );
          })}

          {(reportSlug || jdUrl) && (
            <>
              <div className="my-1 h-px bg-border" />
              {reportSlug && (
                <a
                  role="menuitem"
                  href={`/reports/${encodeURIComponent(reportSlug)}`}
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1 hover:bg-accent hover:text-accent-foreground"
                >
                  <FileText className="size-3" />
                  Open report
                </a>
              )}
              {jdUrl && (
                <a
                  role="menuitem"
                  href={jdUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1 hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="size-3" />
                  Open JD URL
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
