"use client";

import { useConvex } from "convex/react";
import { useEffect, useState } from "react";

/**
 * Surfaces a dropped Convex connection. The reactive client auto-reconnects, so
 * without this the page just silently stops updating (the `ws 1006` hang). We
 * give the socket a short grace period on first load, then show a banner while
 * it stays disconnected.
 */
export function ConvexConnectionBanner() {
  const convex = useConvex();
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    let grace = true;
    const graceTimer = setTimeout(() => {
      grace = false;
    }, 4000);

    const poll = setInterval(() => {
      try {
        const state = convex.connectionState();
        const connected = state.isWebSocketConnected;
        setDisconnected(!(connected || grace));
      } catch {
        // connectionState unavailable in this client version — never warn.
        setDisconnected(false);
      }
    }, 2000);

    return () => {
      clearTimeout(graceTimer);
      clearInterval(poll);
    };
  }, [convex]);

  if (!disconnected) {
    return null;
  }

  return (
    <div className="bg-high px-4 py-2 text-center text-white text-xs">
      Reconnecting to the backend… make sure the Convex dev server is running (
      <span className="font-mono">pnpm convex:dev</span>).
    </div>
  );
}
