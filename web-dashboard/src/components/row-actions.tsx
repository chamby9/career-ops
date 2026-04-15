"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, ExternalLink, FileText, Check } from "lucide-react";
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

type Props = {
  num: number;
  currentStatus: string;
  reportSlug: string | null;
  jdUrl: string | null;
  onStatusChange: (status: CanonicalStatus) => void;
};

export function RowActions({ num, currentStatus, reportSlug, jdUrl, onStatusChange }: Props) {
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
