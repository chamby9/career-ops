import { readFile, writeFile, rename } from "node:fs/promises";
import { paths } from "@/lib/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CANONICAL_STATUSES = [
  "Evaluated",
  "Applied",
  "Responded",
  "Interview",
  "Offer",
  "Rejected",
  "Discarded",
  "SKIP",
] as const;

type CanonicalStatus = (typeof CANONICAL_STATUSES)[number];

function isCanonical(s: string): s is CanonicalStatus {
  return (CANONICAL_STATUSES as readonly string[]).includes(s);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ num: string }> }
) {
  const { num: numRaw } = await params;
  const num = parseInt(numRaw, 10);
  if (!Number.isFinite(num) || num <= 0) {
    return Response.json({ error: "invalid num" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const status = (body.status ?? "").trim();
  if (!isCanonical(status)) {
    return Response.json(
      { error: `status must be one of: ${CANONICAL_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  let content: string;
  try {
    content = await readFile(paths.applications, "utf8");
  } catch {
    return Response.json({ error: "applications.md not found" }, { status: 500 });
  }

  const lines = content.split("\n");
  const rowPrefix = new RegExp(`^\\|\\s*${num}\\s*\\|`);
  let matched = false;

  for (let i = 0; i < lines.length; i++) {
    if (!rowPrefix.test(lines[i])) continue;

    const cells = lines[i]
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|");

    if (cells.length < 9) continue;
    cells[5] = ` ${status} `;
    lines[i] = "|" + cells.join("|") + "|";
    matched = true;
    break;
  }

  if (!matched) {
    return Response.json({ error: `row #${num} not found` }, { status: 404 });
  }

  const tmp = paths.applications + ".tmp";
  await writeFile(tmp, lines.join("\n"));
  await rename(tmp, paths.applications);

  return Response.json({ ok: true, num, status });
}
