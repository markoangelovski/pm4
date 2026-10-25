"use client";

import { useEffect } from "react";

/** Registers /sw.js in a production build (feat-shell-pwa D8); elsewhere removes any registration. Renders nothing. */
export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // No worker only means no offline shell; the app works as before.
        });
      return;
    }
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((r) => r.unregister()))
      );
  }, []);
  return null;
}
