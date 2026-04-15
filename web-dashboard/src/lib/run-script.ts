import { spawn } from "node:child_process";
import { PROJECT_ROOT } from "./paths";

export type RunResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  durationMs: number;
};

export type RunOptions = {
  timeoutMs?: number;
  maxBufferBytes?: number;
};

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_BUFFER = 4 * 1024 * 1024; // 4 MiB per stream

export async function runScript(
  scriptName: string,
  args: string[] = [],
  opts: RunOptions = {},
): Promise<RunResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const maxBuffer = opts.maxBufferBytes ?? DEFAULT_BUFFER;

  const started = Date.now();
  return await new Promise<RunResult>((resolve) => {
    const child = spawn("node", [scriptName, ...args], {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 500);
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes <= maxBuffer) stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= maxBuffer) stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        stdout,
        stderr: stderr + `\nspawn error: ${err.message}`,
        exitCode: null,
        signal: null,
        timedOut,
        durationMs: Date.now() - started,
      });
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        ok: !timedOut && code === 0,
        stdout,
        stderr,
        exitCode: code,
        signal,
        timedOut,
        durationMs: Date.now() - started,
      });
    });
  });
}
