import chokidar, { type FSWatcher } from "chokidar";
import { paths } from "@/lib/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let watcher: FSWatcher | null = null;
const subscribers = new Set<(data: string) => void>();

function ensureWatcher() {
  if (watcher) return;
  watcher = chokidar.watch([paths.dataDir, paths.reportsDir], {
    ignoreInitial: true,
    ignored: (p) => p.includes("/.") || p.endsWith(".swp"),
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  const notify = (path: string) => {
    const payload = JSON.stringify({ path, t: Date.now() });
    for (const fn of subscribers) fn(payload);
  };

  watcher.on("add", notify);
  watcher.on("change", notify);
  watcher.on("unlink", notify);
}

export async function GET() {
  ensureWatcher();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string, event = "change") => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          /* closed */
        }
      };

      send(JSON.stringify({ connected: true }), "ready");

      const handler = (data: string) => send(data, "change");
      subscribers.add(handler);

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 25000);

      const cleanup = () => {
        subscribers.delete(handler);
        clearInterval(keepalive);
        try { controller.close(); } catch { /* noop */ }
      };

      // @ts-expect-error Next request signal hookup via closure
      globalThis.__sse_cleanup = cleanup;
    },
    cancel() {
      // @ts-expect-error cleanup on disconnect
      const fn = globalThis.__sse_cleanup as (() => void) | undefined;
      fn?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
