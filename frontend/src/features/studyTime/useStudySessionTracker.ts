import { useEffect, useRef } from "react";

import { useAuth } from "../../app/providers/AuthProvider";
import { getApiBaseUrl } from "../../shared/config/env";

type StartResponse = {
  id: string;
};

export function useStudySessionTracker(context: string) {
  const { authFetch, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();

  const sessionIdRef = useRef<string | null>(null);
  const pendingSecondsRef = useRef(0);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const idleMs = 60_000;

    function markActivity() {
      lastActivityRef.current = Date.now();
    }

    const onVisibility = () => {
      void flush();
    };
    const onBeforeUnload = () => {
      void stop();
    };

    async function start() {
      const res = await authFetch(`${apiBaseUrl}/study-sessions/start/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as StartResponse;
      if (!cancelled) sessionIdRef.current = data.id;
    }

    async function flush() {
      const sessionId = sessionIdRef.current;
      const seconds = pendingSecondsRef.current;
      if (!sessionId || seconds <= 0) return;

      pendingSecondsRef.current = 0;
      await authFetch(`${apiBaseUrl}/study-sessions/ping/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, active_seconds: seconds }),
        keepalive: true,
      }).catch(() => undefined);
    }

    async function stop() {
      await flush();
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      sessionIdRef.current = null;
      await authFetch(`${apiBaseUrl}/study-sessions/stop/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
        keepalive: true,
      }).catch(() => undefined);
    }

    const tick = window.setInterval(() => {
      const now = Date.now();
      const isIdle = now - lastActivityRef.current > idleMs;
      const isVisible = document.visibilityState === "visible";
      if (!isIdle && isVisible) pendingSecondsRef.current += 1;
    }, 1000);

    const flushInterval = window.setInterval(() => {
      void flush();
    }, 30_000);

    window.addEventListener("mousemove", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("scroll", markActivity, { passive: true });
    window.addEventListener("touchstart", markActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    void start();

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      window.clearInterval(flushInterval);
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("scroll", markActivity);
      window.removeEventListener("touchstart", markActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      void stop();
    };
  }, [authFetch, context, user]);
}
