import { requireLocal } from "@/lib/auth";
import { runScript } from "@/lib/run-script";
import { jsonResponse } from "@/lib/script-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const forbidden = requireLocal(req);
  if (forbidden) return forbidden;

  let body: { minThreshold?: number } = {};
  try {
    body = (await req.json()) ?? {};
  } catch { /* empty body is fine */ }

  const args: string[] = [];
  if (typeof body.minThreshold === "number" && body.minThreshold >= 0) {
    args.push("--min-threshold", String(body.minThreshold));
  }

  const result = await runScript("analyze-patterns.mjs", args, { timeoutMs: 5000 });
  return jsonResponse(result);
}
