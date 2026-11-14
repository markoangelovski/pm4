"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  ChartColumn,
  Check,
  Clock,
  Copy,
  FolderKanban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { parseDurationInput } from "@/proto/features/time/duration";
import { DURATION_EXAMPLES, SAMPLE_PROMPT } from "./landing-sample";

/** The landing page's interactive pieces: they run in the browser, on sample content only (no API, no user data). */

const TOUR = [
  { id: "logs", label: "Logs", group: "Time", path: "/app/time", icon: Clock },
  {
    id: "bookings",
    label: "Bookings",
    group: "Time",
    path: "/app/bookings",
    icon: CalendarCheck
  },
  {
    id: "dashboard",
    label: "Statistics",
    group: "Dashboard",
    path: "/app",
    icon: ChartColumn
  },
  {
    id: "projects",
    label: "Projects",
    group: "Project management",
    path: "/app/projects",
    icon: FolderKanban
  }
] as const;

type TourId = (typeof TOUR)[number]["id"];

/**
 * The hero's product tour: an app window whose sidebar switches between pictures of PM4's main screens.
 * The screens are server-rendered and passed in by id.
 */
export function ProductTour({
  screens
}: {
  screens: Record<TourId, ReactNode>;
}) {
  const [active, setActive] = useState<TourId>("logs");
  const path = TOUR.find((t) => t.id === active)?.path;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-left text-card-foreground shadow-[0_32px_80px_-32px_rgb(0_0_0/0.35)]">
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-2.5">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </span>
        <span className="mx-auto w-full max-w-xs truncate rounded-md bg-background px-3 py-1 text-center text-[11px] text-muted-foreground">
          pm4.angelovski.top{path}
        </span>
        <span aria-hidden className="w-11" />
      </div>

      <Tabs
        value={active}
        onValueChange={(value) => setActive(value as TourId)}
        className="!flex-col gap-0 md:!flex-row"
      >
        <TabsList
          aria-label="PM4 screens"
          className="!h-auto w-full shrink-0 flex-row items-stretch justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-muted/30 !p-2 md:w-44 md:flex-col md:border-r md:border-b-0 md:!p-3"
        >
          <span className="hidden items-center gap-2 px-1 pb-3 md:flex">
            <Image
              src="/images/logos/logoicon.svg"
              alt=""
              width={22}
              height={22}
              className="size-[22px]"
            />
            <span className="text-sm font-semibold text-foreground">PM4</span>
          </span>
          {TOUR.map(({ id, label, group, icon: Icon }, i) => (
            <span key={id} className="contents">
              {group !== TOUR[i - 1]?.group && (
                <span
                  aria-hidden
                  className="hidden px-2 pt-2 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase md:block"
                >
                  {group}
                </span>
              )}
              <TabsTrigger
                value={id}
                className="h-8 flex-none justify-start gap-2 !rounded-md px-2.5 text-xs after:hidden data-active:!border-transparent data-active:!bg-primary data-active:!text-primary-foreground md:w-full"
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </TabsTrigger>
            </span>
          ))}
          <span className="mt-auto hidden px-2 pt-6 text-[11px] leading-snug text-muted-foreground md:block">
            Pick a screen to look around.
          </span>
        </TabsList>

        {TOUR.map(({ id }) => (
          <TabsContent
            key={id}
            value={id}
            className="min-h-[30rem] min-w-0 p-4 sm:p-6 md:min-h-[36rem]"
          >
            {screens[id]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** A working copy of the app's duration field (FR-TLOG-010): type a duration, see what PM4 stores. */
export function DurationTry() {
  const [value, setValue] = useState("1.5");
  const parsed = parseDurationInput(value);
  const blocks = parsed.ok ? parsed.minutes / 15 : 0;
  const shown = Math.min(blocks, 32);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="landing-duration" className="text-sm font-medium">
          Duration
        </label>
        <div className="flex items-center gap-3">
          <Input
            id="landing-duration"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!parsed.ok}
            aria-describedby="landing-duration-result"
            className="h-10 w-32 text-base tabular-nums"
          />
          <ArrowRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <p
            id="landing-duration-result"
            aria-live="polite"
            className={cn(
              "min-w-0",
              parsed.ok
                ? "text-2xl font-semibold tracking-tight tabular-nums"
                : "text-sm text-destructive"
            )}
          >
            {parsed.ok ? formatDuration(parsed.minutes) : parsed.error}
          </p>
        </div>
      </div>

      <div
        aria-hidden
        className="flex min-h-9 flex-wrap content-start items-center gap-1"
      >
        {Array.from({ length: shown }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-3.5 w-3 rounded-[3px] bg-[var(--lp-worked)]",
              i % 4 === 3 && "mr-1.5"
            )}
          />
        ))}
        {blocks > shown && (
          <span className="text-xs text-muted-foreground tabular-nums">
            +{blocks - shown}
          </span>
        )}
        {parsed.ok && (
          <span className="ml-1 text-xs text-muted-foreground tabular-nums">
            {blocks} × 15 min
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Try</span>
        {DURATION_EXAMPLES.map((example) => (
          <Button
            key={example}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 !rounded-md px-2 font-mono text-xs"
            onClick={() => setValue(example)}
          >
            {example}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** The booking prompt with the app's "Copy to clipboard" button, working on the sample text. */
export function PromptCopy() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Prompt for 3 Nov 2026</p>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          <span aria-live="polite">
            {copied ? "Copied" : "Copy to clipboard"}
          </span>
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
        {SAMPLE_PROMPT}
      </pre>
    </div>
  );
}
