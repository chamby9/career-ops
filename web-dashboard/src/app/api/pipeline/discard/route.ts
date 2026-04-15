import { readFile, writeFile, rename } from "node:fs/promises";
import { paths } from "@/lib/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { url?: string; urls?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const targets = new Set<string>();
  if (typeof body.url === "string" && body.url.trim()) targets.add(body.url.trim());
  if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (typeof u === "string" && u.trim()) targets.add(u.trim());
    }
  }
  if (targets.size === 0) {
    return Response.json({ error: "url or urls required" }, { status: 400 });
  }

  let content: string;
  try {
    content = await readFile(paths.pipeline, "utf8");
  } catch {
    return Response.json({ error: "pipeline.md not found" }, { status: 500 });
  }

  const lines = content.split("\n");
  const kept: string[] = [];
  let removed = 0;

  for (const line of lines) {
    const match = line.match(/(https?:\/\/\S+)/);
    if (match && targets.has(match[1])) {
      removed += 1;
      continue;
    }
    kept.push(line);
  }

  if (removed === 0) {
    return Response.json({ ok: true, removed: 0, note: "no matching urls" });
  }

  const tmp = paths.pipeline + ".tmp";
  await writeFile(tmp, kept.join("\n"));
  await rename(tmp, paths.pipeline);

  return Response.json({ ok: true, removed });
}
