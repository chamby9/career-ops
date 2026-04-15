import { requireLocal } from "@/lib/auth";
import { runScript } from "@/lib/run-script";
import { rawResponse } from "@/lib/script-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const forbidden = requireLocal(req);
  if (forbidden) return forbidden;

  let body: { dryRun?: boolean } = {};
  try {
    body = (await req.json()) ?? {};
  } catch { /* empty body is fine */ }

  const args = body.dryRun ? ["--dry-run"] : [];
  const result = await runScript("dedup-tracker.mjs", args, { timeoutMs: 10_000 });
  return rawResponse(result);
}
