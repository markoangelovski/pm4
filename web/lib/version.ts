/** `web/package.json` version, inlined at build time by next.config.ts (OQ-051). "0.0.0" outside a Next build. */
export function webVersion(): string {
  throw new Error("not implemented (feat-shell-sidebar-branding)");
}

/** "0.1.0" → "v0.1.0". Returns one string so the pill renders a single text node. */
export function formatVersion(version: string): string {
  void version;
  throw new Error("not implemented (feat-shell-sidebar-branding)");
}

export type ApiVersionState =
  | { status: "pending" }
  | { status: "error" }
  | { status: "success"; version: string };

/** "Web v0.1.0 · API v0.0.1" | "Web v0.1.0 · API …" | "Web v0.1.0 · API —" */
export function versionSummary(web: string, api: ApiVersionState): string {
  void web;
  void api;
  throw new Error("not implemented (feat-shell-sidebar-branding)");
}
