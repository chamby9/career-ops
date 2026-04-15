import { requireLocal } from "@/lib/auth";
import { runScript } from "@/lib/run-script";
import { rawResponse } from "@/lib/script-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const forbidden = requireLocal(req);
  if (forbidden) return forbidden;

  let body: { dryRun?: boolean; company?: string } = {};
  try {
    body = (await req.json()) ?? {};
  } catch { /* empty body is fine */ }

  const args: string[] = [];
  if (body.dryRun) args.push("--dry-run");
  if (typeof body.company === "string" && body.company.trim()) {
    args.push("--company", body.company.trim());
  }

  const result = await runScript("scan.mjs", args, { timeoutMs: 120_000 });
  return rawResponse(result);
}
