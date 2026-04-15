import { runScript } from "@/lib/run-script";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_URLS = 10;

export async function POST(req: Request) {
  let body: { urls?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return Response.json({ error: "urls must be a non-empty string[]" }, { status: 400 });
  }
  if (body.urls.length > MAX_URLS) {
    return Response.json({ error: `too many urls (max ${MAX_URLS})` }, { status: 400 });
  }

  const urls: string[] = [];
  for (const u of body.urls) {
    if (typeof u !== "string" || !/^https?:\/\//.test(u)) {
      return Response.json({ error: "urls must be http(s) strings" }, { status: 400 });
    }
    urls.push(u);
  }

  const timeoutMs = urls.length * 15_000 + 5_000;
  const result = await runScript("check-liveness.mjs", urls, { timeoutMs });

  // exit 1 = at least one URL expired/uncertain; still a successful run
  const ranOk = result.ok || (result.exitCode === 1 && !result.timedOut);

  return Response.json({
    ok: ranOk,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr.slice(-1000),
    timedOut: result.timedOut,
  });
}
