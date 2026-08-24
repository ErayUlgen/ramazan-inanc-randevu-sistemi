import { useEffect, useRef, useState } from "react";
import { createAdminEventSource } from "../api/adminApi";

export type AdminRealtimeState = "connecting" | "connected" | "reconnecting";
export type AdminRealtimeEvent = {
  id: string;
  resourceType: string;
  resourceId: string | null;
  action: string;
  occurredAt: string;
};

export function useAdminRealtime(
  onResourceChanged: (event: AdminRealtimeEvent) => void,
) {
  const [state, setState] = useState<AdminRealtimeState>("connecting");
  const callback = useRef(onResourceChanged);
  callback.current = onResourceChanged;

  useEffect(() => {
    let source: EventSource | null = null;
    let retryTimer = 0;
    let retryCount = 0;
    let coalesceTimer = 0;
    let stopped = false;
    const delivered = new Set<string>();

    const connect = () => {
      if (stopped) return;
      setState(retryCount ? "reconnecting" : "connecting");
      source = createAdminEventSource();
      source.addEventListener("stream-status", () => {
        retryCount = 0;
        setState("connected");
      });
      source.addEventListener("resource-changed", (message) => {
        let parsed: Omit<AdminRealtimeEvent, "id">;
        try {
          parsed = JSON.parse((message as MessageEvent).data) as Omit<
            AdminRealtimeEvent,
            "id"
          >;
        } catch {
          return;
        }
        const id = (message as MessageEvent).lastEventId;
        if (!id || delivered.has(id)) return;
        delivered.add(id);
        if (delivered.size > 250) {
          const oldest = delivered.values().next().value as string | undefined;
          if (oldest) delivered.delete(oldest);
        }
        window.clearTimeout(coalesceTimer);
        coalesceTimer = window.setTimeout(
          () => callback.current({ id, ...parsed }),
          250,
        );
      });
      source.onerror = () => {
        source?.close();
        setState("reconnecting");
        const delay = Math.min(1_000 * 2 ** retryCount, 20_000);
        retryCount += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && !source) connect();
    };
    document.addEventListener("visibilitychange", onVisible);
    connect();
    return () => {
      stopped = true;
      source?.close();
      window.clearTimeout(retryTimer);
      window.clearTimeout(coalesceTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return state;
}
