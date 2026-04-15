import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { paths } from "@/lib/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readCompanyForRow(num: number): Promise<string | null> {
  let content: string;
  try {
    content = await readFile(paths.applications, "utf8");
  } catch {
    return null;
  }
  const rowPrefix = new RegExp(`^\\|\\s*${num}\\s*\\|`);
  for (const line of content.split("\n")) {
    if (!rowPrefix.test(line)) continue;
    const cells = line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    if (cells.length < 9) continue;
    return cells[2] || null;
  }
  return null;
}

async function findPdf(companySlug: string): Promise<string | null> {
  let files: string[];
  try {
    files = await readdir(paths.outputDir);
  } catch {
    return null;
  }

  const token = `-${companySlug}-`;
  const candidates = files.filter(
    (f) => f.toLowerCase().endsWith(".pdf") && f.toLowerCase().includes(token),
  );
  if (candidates.length === 0) return null;

  const withMtime = await Promise.all(
    candidates.map(async (name) => {
      const full = path.join(paths.outputDir, name);
      const s = await stat(full);
      return { full, name, mtime: s.mtimeMs };
    }),
  );
  withMtime.sort((a, b) => b.mtime - a.mtime);
  return withMtime[0].full;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ num: string }> },
) {
  const { num: numRaw } = await params;
  const num = parseInt(numRaw, 10);
  if (!Number.isFinite(num) || num <= 0) {
    return Response.json({ error: "invalid num" }, { status: 400 });
  }

  const company = await readCompanyForRow(num);
  if (!company) {
    return Response.json({ error: `row #${num} not found` }, { status: 404 });
  }

  const slug = slugify(company);
  if (!slug) {
    return Response.json({ error: "company has no slug" }, { status: 404 });
  }

  const resolved = await findPdf(slug);
  if (!resolved) {
    return Response.json(
      { error: `no PDF in output/ matching "${slug}"` },
      { status: 404 },
    );
  }

  // Defense in depth: ensure resolved path stays inside outputDir.
  const outputDir = path.resolve(paths.outputDir);
  const resolvedAbs = path.resolve(resolved);
  if (!resolvedAbs.startsWith(outputDir + path.sep)) {
    return Response.json({ error: "resolved path outside output/" }, { status: 500 });
  }

  const data = await readFile(resolvedAbs);
  const filename = path.basename(resolvedAbs);
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
