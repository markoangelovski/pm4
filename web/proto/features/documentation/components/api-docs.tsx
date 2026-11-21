"use client";

import { useEffect, useMemo, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type { ApiReferenceReact as ScalarReference } from "@scalar/api-reference-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getApiDocsAccessToken,
  useApiSpec,
  type OpenApiDocument
} from "../api";

/** Scalar and its stylesheet run in the browser only, and load only when this tab opens. */
const ApiReferenceReact = dynamic(
  () => import("./scalar-reference").then((m) => m.ApiReferenceReact),
  { ssr: false, loading: () => <ApiDocsSkeleton /> }
);

/** Scalar's colours and fonts from the app's theme tokens, so the reference follows light and dark mode. */
const CUSTOM_CSS = `
.scalar-app {
  --scalar-font: var(--font-geist), ui-sans-serif, system-ui, sans-serif;
  --scalar-font-code: var(--font-geist-mono), ui-monospace, monospace;
  --scalar-radius: calc(var(--radius) * 0.8);
  --scalar-radius-lg: var(--radius);
  --scalar-radius-xl: calc(var(--radius) * 1.4);
}
.light-mode, .dark-mode {
  --scalar-background-1: var(--background);
  --scalar-background-2: var(--muted);
  --scalar-background-3: var(--accent);
  --scalar-background-accent: color-mix(in oklab, var(--primary) 10%, transparent);
  --scalar-color-1: var(--foreground);
  --scalar-color-2: var(--muted-foreground);
  --scalar-color-3: var(--muted-foreground);
  --scalar-color-accent: var(--primary);
  --scalar-border-color: var(--border);
}
`;

/** The reference's scroll box: the viewport below the page heading, at least 32rem. */
const BOX_HEIGHT = "max(32rem, calc(100dvh - 12rem))";

/** The reference scrolls in its own box (the shell's main clips sticky content): its sidebar fills that box. */
const BOX_CSS = `
.scalar-app .t-doc__sidebar {
  height: ${BOX_HEIGHT};
}
`;

function ApiDocsSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-full max-w-sm" />
      <Skeleton className="h-32 w-full" />
    </Card>
  );
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/** True when the request goes to this build's API (same origin as `API_BASE_URL`). */
function isApiRequest(url: string): boolean {
  if (!API_BASE_URL) return false;
  try {
    return new URL(url).origin === new URL(API_BASE_URL).origin;
  } catch {
    return false;
  }
}

type ScalarConfiguration = ComponentProps<
  typeof ScalarReference
>["configuration"];

function ApiReference({ spec }: { spec: OpenApiDocument }) {
  const { resolvedTheme } = useTheme();
  const configuration = useMemo<ScalarConfiguration>(
    () => ({
      content: spec,
      layout: "modern",
      // The document lists no servers: requests go to this build's API.
      servers: API_BASE_URL ? [{ url: API_BASE_URL }] : [],
      forceDarkModeState: resolvedTheme === "dark" ? "dark" : "light",
      hideDarkModeToggle: true,
      withDefaultFonts: false,
      customCss: CUSTOM_CSS + BOX_CSS,
      hideClientButton: true,
      showDeveloperTools: "never",
      telemetry: false,
      // No third-party AI chat or MCP server: the reference only shows PM4's own API.
      agent: { disabled: true },
      mcp: { disabled: true },
      authentication: { preferredSecurityScheme: "bearer" },
      // "Test request" calls the API as the signed-in user. The token goes only to this build's API, never to an
      // address typed into the request.
      onBeforeRequest: async ({ request }) => {
        if (!isApiRequest(request.url)) return;
        const token = await getApiDocsAccessToken();
        if (token) request.headers.set("Authorization", `Bearer ${token}`);
      }
    }),
    [spec, resolvedTheme]
  );
  return <ApiReferenceReact configuration={configuration} />;
}

/** Documentation → API Docs: the API's OpenAPI document as an interactive reference (Scalar). */
export function ApiDocs() {
  const { data, isPending, isError, refetch } = useApiSpec();

  // Scalar keeps the open section in the URL hash (#tag/…): drop it when the tab closes.
  useEffect(
    () => () => {
      if (window.location.hash) {
        const { pathname, search } = window.location;
        window.history.replaceState(
          window.history.state,
          "",
          pathname + search
        );
      }
    },
    []
  );

  if (isError && data === undefined) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6">
        <p className="text-sm">Couldn&apos;t load the API docs.</p>
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </Card>
    );
  }
  if (isPending) return <ApiDocsSkeleton />;
  if (data === null) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          This build has no API docs.
        </p>
      </Card>
    );
  }
  return (
    <div
      className="overflow-y-auto overscroll-contain rounded-md border"
      style={{ height: BOX_HEIGHT }}
    >
      <ApiReference spec={data} />
    </div>
  );
}
