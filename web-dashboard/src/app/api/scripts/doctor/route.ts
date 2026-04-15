import { requireLocal } from "@/lib/auth";
import { runScript } from "@/lib/run-script";
import { rawResponse } from "@/lib/script-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const forbidden = requireLocal(req);
  if (forbidden) return forbidden;

  const result = await runScript("doctor.mjs", [], { timeoutMs: 10_000 });
  // doctor exits 1 when checks fail — still a successful run
  if (result.exitCode === 1 && !result.timedOut) {
    return Response.json({
      ok: true,
      exitCode: 1,
      note: "doctor reported failing checks",
      durationMs: result.durationMs,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }
  return rawResponse(result);
}
