/** `web/package.json` version, inlined at build time by next.config.ts (OQ-051). "0.0.0" outside a Next build. */
export function webVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
}

/** "0.1.0" → "v0.1.0". Returns one string so the pill renders a single text node. */
export function formatVersion(version: string): string {
  return `v${version}`;
}

export type ApiVersionState =
  | { status: "pending" }
  | { status: "error" }
  | { status: "success"; version: string };

/** "Web v0.1.0 · API v0.0.1" | "Web v0.1.0 · API …" | "Web v0.1.0 · API —" */
export function versionSummary(web: string, api: ApiVersionState): string {
  const apiPart =
    api.status === "success"
      ? formatVersion(api.version)
      : api.status === "pending"
        ? "…"
        : "—";
  return `Web ${formatVersion(web)} · API ${apiPart}`;
}
