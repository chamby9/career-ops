import { requireLocal } from "@/lib/auth";
import { runScript } from "@/lib/run-script";
import { rawResponse } from "@/lib/script-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const forbidden = requireLocal(req);
  if (forbidden) return forbidden;

  const result = await runScript("verify-pipeline.mjs", [], { timeoutMs: 5000 });
  // verify-pipeline exits 1 when it finds issues — still a successful run
  if (result.exitCode === 1 && !result.timedOut) {
    return Response.json({
      ok: true,
      exitCode: 1,
      note: "verify-pipeline reported issues",
      durationMs: result.durationMs,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }
  return rawResponse(result);
}
