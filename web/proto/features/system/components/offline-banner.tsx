"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** True while the browser reports no network. Online on the server and before hydration. */
function useOffline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false
  );
}

/** A strip under the shell header while the device is offline: the app opens from cache, data needs the network. */
export function OfflineBanner(): React.JSX.Element | null {
  const offline = useOffline();
  if (!offline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-border bg-muted px-4 py-1.5 text-center text-xs text-muted-foreground"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      <span>
        You&apos;re offline. Data can&apos;t load or save until you&apos;re back
        online.
      </span>
    </div>
  );
}
