import { requireLocal } from "@/lib/auth";
import { runScript } from "@/lib/run-script";
import { jsonResponse } from "@/lib/script-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const forbidden = requireLocal(req);
  if (forbidden) return forbidden;

  let body: { overdueOnly?: boolean; appliedDays?: number } = {};
  try {
    body = (await req.json()) ?? {};
  } catch { /* empty body is fine */ }

  const args: string[] = [];
  if (body.overdueOnly) args.push("--overdue-only");
  if (typeof body.appliedDays === "number" && body.appliedDays > 0) {
    args.push("--applied-days", String(body.appliedDays));
  }

  const result = await runScript("followup-cadence.mjs", args, { timeoutMs: 5000 });
  return jsonResponse(result);
}
