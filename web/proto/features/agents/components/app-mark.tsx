import { cn } from "@/lib/utils";

/**
 * An app's mark: its first letter on a tint derived from the name, so each app keeps the same colour. Apps don't
 * send a trusted logo (FR-MCP-003), so PM4 never shows one.
 */
export function AppMark({
  name,
  className
}: {
  name: string;
  className?: string;
}) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return (
    <span
      aria-hidden
      style={{ backgroundColor: `oklch(0.62 0.13 ${hue})` }}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[0.7em] font-semibold text-white",
        className
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
