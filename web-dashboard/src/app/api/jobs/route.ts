import { appendFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { paths } from "@/lib/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Action = "evaluate" | "scan" | "pdf";

const ALLOWED: Action[] = ["evaluate", "scan", "pdf"];

function validate(action: string, args: Record<string, unknown>): string | null {
  if (!ALLOWED.includes(action as Action)) return `unknown action: ${action}`;
  if (action === "evaluate") {
    const url = args?.url;
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) return "evaluate requires valid url";
  }
  if (action === "pdf") {
    const company = args?.company;
    if (typeof company !== "string" || !company.trim()) return "pdf requires company";
  }
  return null;
}

export async function POST(req: Request) {
  let body: { action?: string; args?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const action = body.action ?? "";
  const args = body.args ?? {};
  const err = validate(action, args);
  if (err) return Response.json({ error: err }, { status: 400 });

  const job = {
    id: randomUUID(),
    action,
    args,
    enqueuedAt: new Date().toISOString(),
  };
  await appendFile(paths.queue, JSON.stringify(job) + "\n");
  return Response.json({ ok: true, job });
}

export async function GET() {
  const queueRaw = existsSync(paths.queue) ? await readFile(paths.queue, "utf8") : "";
  const statusRaw = existsSync(paths.queueStatus) ? await readFile(paths.queueStatus, "utf8") : "";

  const jobs = new Map<string, Record<string, unknown>>();
  for (const line of queueRaw.split("\n").filter(Boolean)) {
    try {
      const j = JSON.parse(line);
      jobs.set(j.id, { ...j, status: "queued" });
    } catch { /* skip */ }
  }
  for (const line of statusRaw.split("\n").filter(Boolean)) {
    try {
      const s = JSON.parse(line);
      const prev = jobs.get(s.id) ?? {};
      jobs.set(s.id, { ...prev, ...s });
    } catch { /* skip */ }
  }

  const list = Array.from(jobs.values()).sort((a, b) => {
    const at = String(a.enqueuedAt ?? a.startedAt ?? "");
    const bt = String(b.enqueuedAt ?? b.startedAt ?? "");
    return bt.localeCompare(at);
  });
  return Response.json({ jobs: list.slice(0, 50) });
}
