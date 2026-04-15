import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { paths } from "@/lib/paths";
import { loadApplications } from "@/lib/parsers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FOLLOWUPS_FILE = path.join(paths.dataDir, "follow-ups.md");

const HEADER = [
  "# Follow-ups",
  "",
  "| # | App# | Date | Company | Role | Channel | Contact | Notes |",
  "|---|------|------|---------|------|---------|---------|-------|",
  "",
].join("\n");

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ num: string }> }
) {
  const { num: numRaw } = await params;
  const appNum = parseInt(numRaw, 10);
  if (!Number.isFinite(appNum) || appNum <= 0) {
    return Response.json({ error: "invalid num" }, { status: 400 });
  }

  let body: { dueDate?: string; channel?: string; contact?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const dueDate = (body.dueDate ?? "").trim();
  if (!isIsoDate(dueDate)) {
    return Response.json({ error: "dueDate must be YYYY-MM-DD" }, { status: 400 });
  }
  const channel = escapeCell(body.channel ?? "scheduled");
  const contact = escapeCell(body.contact ?? "");
  const notes = escapeCell(body.notes ?? "");

  const apps = await loadApplications();
  const app = apps.find((a) => a.num === appNum);
  if (!app) {
    return Response.json({ error: `application #${appNum} not found` }, { status: 404 });
  }

  let existing = "";
  try {
    existing = await readFile(FOLLOWUPS_FILE, "utf8");
  } catch {
    existing = "";
  }

  let nextSeq = 1;
  for (const line of existing.split("\n")) {
    if (!line.startsWith("|")) continue;
    const parts = line.split("|").map((s) => s.trim());
    if (parts.length < 3) continue;
    const n = parseInt(parts[1], 10);
    if (Number.isFinite(n) && n >= nextSeq) nextSeq = n + 1;
  }

  const row = `| ${nextSeq} | ${appNum} | ${dueDate} | ${escapeCell(app.company)} | ${escapeCell(app.role)} | ${channel} | ${contact} | ${notes} |`;

  const base = existing || HEADER;
  const needsNewline = base.length > 0 && !base.endsWith("\n");
  const nextContent = base + (needsNewline ? "\n" : "") + row + "\n";

  const tmp = FOLLOWUPS_FILE + ".tmp";
  await writeFile(tmp, nextContent);
  await rename(tmp, FOLLOWUPS_FILE);

  return Response.json({
    ok: true,
    followup: { seq: nextSeq, appNum, date: dueDate, company: app.company, role: app.role, channel, contact, notes },
  });
}
