import { runScript } from "@/lib/run-script";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const result = await runScript("scan.mjs", [], { timeoutMs: 120_000 });
  return Response.json({
    ok: result.ok,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    stdout: result.stdout.slice(-4000),
    stderr: result.stderr.slice(-2000),
    timedOut: result.timedOut,
  });
}
