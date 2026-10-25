import { cn } from "@/lib/utils";

// The PM4 mark's three staggered bars (brand-assets.md), drawn larger as timeline tracks.
const BARS = [
  { x: 4, y: 10 },
  { x: 22, y: 25 },
  { x: 40, y: 40 }
];
const WIDTH = 54;
const HEIGHT = 10;

// Intro, once: the tracks rise in one by one. Loop: each bar grows from a dot on the left, holds, then drains
// out to the right, a beat after the one above. Reduced motion: full bars that only fade.
const CSS = `
.pm4-lm-track{animation:pm4-lm-rise .5s cubic-bezier(.2,.8,.2,1) both}
.pm4-lm-fill{animation:pm4-lm-fill 2.2s cubic-bezier(.65,0,.35,1) infinite both}
@keyframes pm4-lm-rise{0%{transform:translateY(6px);opacity:0}100%{transform:none;opacity:1}}
@keyframes pm4-lm-fill{0%{stroke-dasharray:0 100;stroke-dashoffset:0;opacity:0}6%,94%{opacity:1}38%,62%{stroke-dasharray:100 100;stroke-dashoffset:0}100%{stroke-dasharray:100 100;stroke-dashoffset:-100;opacity:0}}
@keyframes pm4-lm-pulse{0%,100%{opacity:1}50%{opacity:.4}}
@media (prefers-reduced-motion:reduce){
  .pm4-lm-track{animation:none}
  .pm4-lm-fill{stroke-dasharray:none;animation:pm4-lm-pulse 1.6s ease-in-out infinite}
}`;

/** Full-page loading animation of the PM4 mark, in the current text colour. Decorative: the caller sets the status. */
export function LoadingMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 98 60"
      aria-hidden="true"
      className={cn("h-auto w-40 text-foreground sm:w-48", className)}
    >
      <style>{CSS}</style>
      {BARS.map((bar, i) => (
        <g
          key={i}
          className="pm4-lm-track"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <rect
            x={bar.x}
            y={bar.y}
            width={WIDTH}
            height={HEIGHT}
            rx={HEIGHT / 2}
            fill="currentColor"
            fillOpacity={0.1}
          />
          {/* A round-capped stroke over the track: the caps make the bar's rounded ends. */}
          <line
            className="pm4-lm-fill"
            x1={bar.x + HEIGHT / 2}
            y1={bar.y + HEIGHT / 2}
            x2={bar.x + WIDTH - HEIGHT / 2}
            y2={bar.y + HEIGHT / 2}
            pathLength={100}
            stroke="currentColor"
            strokeWidth={HEIGHT}
            strokeLinecap="round"
            style={{ animationDelay: `${0.3 + i * 0.18}s` }}
          />
        </g>
      ))}
    </svg>
  );
}
