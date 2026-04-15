import { requireLocal } from "@/lib/auth";
import { runScript } from "@/lib/run-script";
import { rawResponse } from "@/lib/script-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_URLS = 10;

export async function POST(req: Request) {
  const forbidden = requireLocal(req);
  if (forbidden) return forbidden;

  let body: { urls?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return Response.json({ error: "urls must be a non-empty string[]" }, { status: 400 });
  }
  if (body.urls.length > MAX_URLS) {
    return Response.json(
      { error: `too many urls (max ${MAX_URLS})` },
      { status: 400 },
    );
  }

  const urls: string[] = [];
  for (const u of body.urls) {
    if (typeof u !== "string") {
      return Response.json({ error: "urls must be strings" }, { status: 400 });
    }
    if (!/^https?:\/\//.test(u)) {
      return Response.json({ error: `invalid url: ${u}` }, { status: 400 });
    }
    urls.push(u);
  }

  // 15s budget per URL (Chromium startup + nav) + 5s slack
  const timeoutMs = urls.length * 15_000 + 5_000;
  const result = await runScript("check-liveness.mjs", urls, { timeoutMs });
  // check-liveness exits 1 if any URL is expired — treat exit codes 0 and 1 as "ran successfully"
  if (result.exitCode === 1 && !result.timedOut) {
    return Response.json({
      ok: true,
      exitCode: 1,
      note: "at least one URL reported expired/uncertain",
      durationMs: result.durationMs,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }
  return rawResponse(result);
}
