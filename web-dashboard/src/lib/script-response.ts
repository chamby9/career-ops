import type { RunResult } from "./run-script";

export function rawResponse(r: RunResult) {
  return Response.json(
    {
      ok: r.ok,
      exitCode: r.exitCode,
      signal: r.signal,
      timedOut: r.timedOut,
      durationMs: r.durationMs,
      stdout: r.stdout,
      stderr: r.stderr,
    },
    { status: r.ok ? 200 : 500 },
  );
}

/**
 * For scripts that emit JSON on stdout. Parses or falls back to raw on parse error.
 */
export function jsonResponse(r: RunResult) {
  if (!r.ok) return rawResponse(r);
  try {
    const data = JSON.parse(r.stdout);
    return Response.json({
      ok: true,
      data,
      durationMs: r.durationMs,
      stderr: r.stderr || undefined,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: "script did not emit valid JSON",
        durationMs: r.durationMs,
        stdout: r.stdout,
        stderr: r.stderr,
      },
      { status: 500 },
    );
  }
}
