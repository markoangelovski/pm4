"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * An app's mark: its first letter on a tint derived from the name, so each app keeps the same colour. On Connected
 * apps, the app's logo (when the API returns one) covers the letter once it has loaded; while it loads, or when it
 * fails, the letter shows. The consent page passes no logo: any app can claim any logo, so the decision there rests
 * on the name and the host.
 */
export function AppMark({
  name,
  logoUri,
  className
}: {
  name: string;
  logoUri?: string | null;
  className?: string;
}) {
  const [loaded, setLoaded] = useState<string | null>(null);
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  const showLogo = !!logoUri && loaded === logoUri;
  return (
    <span
      aria-hidden
      style={
        showLogo ? undefined : { backgroundColor: `oklch(0.62 0.13 ${hue})` }
      }
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md text-[0.7em] font-semibold text-white",
        showLogo && "bg-background ring-1 ring-border ring-inset",
        className
      )}
    >
      {!showLogo && (name.trim().charAt(0).toUpperCase() || "?")}
      {logoUri && (
        // A plain <img>: the static export has no image optimisation, and the theme's Avatar is always round.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={logoUri}
          src={logoUri}
          alt=""
          // The app's host doesn't learn which PM4 page showed its logo.
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(logoUri)}
          className={cn(
            "absolute inset-0 size-full object-contain",
            !showLogo && "invisible"
          )}
        />
      )}
    </span>
  );
}
