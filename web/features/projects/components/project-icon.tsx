import { cn } from "@/lib/utils";

/** FNV-1a, 32-bit: spreads similar ids (`p1`, `p2`, consecutive UUIDs) apart. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mid lightness and chroma read on both the light and the dark theme. */
const color = (hue: number, lightness: number) =>
  `oklch(${lightness} 0.15 ${hue})`;

/**
 * A project's icon: a two-colour gradient derived from its id, so it is stable without storing
 * anything. Rounded square, because people are circles.
 */
export function ProjectIcon({
  project,
  className
}: {
  project: { id: string };
  className?: string;
}) {
  const h = hash(project.id);
  const hue = h % 360;
  const hue2 = (hue + 40 + ((h >>> 9) % 80)) % 360;
  const angle = ((h >>> 16) % 8) * 45;
  return (
    <span
      aria-hidden
      className={cn("block size-6 shrink-0 rounded-md", className)}
      style={{
        background: `linear-gradient(${angle}deg, ${color(hue, 0.72)}, ${color(hue2, 0.52)})`
      }}
    />
  );
}
