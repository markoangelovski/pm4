"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

/** Near-black fills in the logos (GitHub, PWA): drawn in the text colour instead, so they show in dark mode too. */
const DARK_FILL = /fill="#(?:000|000000|161614|3d3d3d)"/g;

/**
 * Makes a logo render under Mermaid's strict sanitizer and in both themes. The Next.js logo clips its circle with a
 * `<mask>` + `<use>`, which the sanitizer strips (the logo comes out blank): drop the mask and outline the circle.
 */
function themeableLogo(name: string, body: string): string {
  let out = body.replace(DARK_FILL, 'fill="currentColor"');
  if (name === "nextjs-icon") {
    out = out
      .replace(/<mask[\s\S]*?<\/mask>/, "")
      .replace(/ mask="url\(#[^)]+\)"/, "")
      .replace(
        '<g><circle cx="128" cy="128" r="128"/>',
        '<g><circle cx="128" cy="128" r="124" stroke="currentColor" stroke-width="8"/>'
      );
  }
  return out;
}

/** Logos for architecture diagrams (`logos:<name>`); the pack's JSON loads only when a diagram first uses one. */
let iconsRegistered = false;
function registerIcons(mermaid: typeof import("mermaid").default) {
  if (iconsRegistered) return;
  iconsRegistered = true;
  mermaid.registerIconPacks([
    {
      name: "logos",
      loader: () =>
        import("@iconify-json/logos").then(({ icons }) => ({
          ...icons,
          icons: Object.fromEntries(
            Object.entries(icons.icons).map(([name, icon]) => [
              name,
              { ...icon, body: themeableLogo(name, icon.body) }
            ])
          )
        }))
    }
  ]);
}

/** The diagram's natural width: Mermaid writes it into the SVG as `max-width: …px`. */
function naturalWidth(svg: string): number | undefined {
  const match = /max-width:\s*([\d.]+)px/.exec(svg);
  return match ? Math.ceil(Number(match[1])) : undefined;
}

/** The last render's result, tagged with the chart and theme it was made for. */
type Result = { key: string } & (
  { status: "ready"; svg: string } | { status: "error" }
);

type State = { status: "loading" } | Result;

/**
 * A Mermaid diagram rendered in the browser. Mermaid loads on first use (dynamic import), so it ships only with
 * the documentation tabs that draw diagrams, and it re-renders when the theme switches between light and dark.
 */
export function MermaidDiagram({
  chart,
  title
}: {
  /** Mermaid source, e.g. `sequenceDiagram …`. */
  chart: string;
  /** Accessible name of the figure, also shown as its caption. */
  title: string;
}) {
  const { resolvedTheme } = useTheme();
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const theme = resolvedTheme === "dark" ? "dark" : "neutral";
  const key = `${theme}:${chart}`;
  const [result, setResult] = useState<Result | null>(null);
  // A result made for another chart or theme is stale: show the loading state until the new one is ready.
  const state: State =
    result && result.key === key ? result : { status: "loading" };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        registerIcons(mermaid);
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme,
          fontFamily: "var(--font-geist), ui-sans-serif, system-ui, sans-serif"
        });
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) setResult({ key, status: "ready", svg });
      } catch {
        if (!cancelled) setResult({ key, status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id, key, theme]);

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative overflow-x-auto rounded-md border bg-background p-4">
        {state.status === "loading" ? (
          <Skeleton className="h-48 w-full" />
        ) : state.status === "error" ? (
          <pre className="font-mono text-xs whitespace-pre-wrap text-muted-foreground">
            {chart}
          </pre>
        ) : (
          <>
            <div
              role="img"
              aria-label={title}
              className="flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
              // Mermaid's own SVG output, rendered with securityLevel "strict" from source in this file tree.
              dangerouslySetInnerHTML={{ __html: state.svg }}
            />
            <FullSizeDialog title={title} svg={state.svg} />
          </>
        )}
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">
        {title}
      </figcaption>
    </figure>
  );
}

/** The diagram at its natural size in a near-fullscreen dialog, scrolling both ways when it's larger. */
function FullSizeDialog({ title, svg }: { title: string; svg: string }) {
  const width = naturalWidth(svg);
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className="absolute top-2 right-2 cursor-pointer"
            aria-label={`View ${title} full size`}
            title="View full size"
          />
        }
      >
        <Maximize2 />
      </DialogTrigger>
      <DialogContent className="flex h-[calc(100dvh-2rem)] flex-col max-w-[calc(100%-2rem)]! rounded-md! sm:max-w-[calc(100%-2rem)]!">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-background p-4">
          <div
            role="img"
            aria-label={title}
            className="mx-auto [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-none!"
            style={{ width: width ? `${width}px` : undefined }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
