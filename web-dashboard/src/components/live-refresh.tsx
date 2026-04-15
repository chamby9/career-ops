"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        es = new EventSource("/api/events");
        es.addEventListener("change", () => router.refresh());
        es.onerror = () => {
          es?.close();
          es = null;
          retryTimer = setTimeout(connect, 3000);
        };
      } catch {
        retryTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [router]);

  return null;
}
