import type { OAuthScope } from "./proposed-types";

/** What each scope lets an app do, in plain words (FR-MCP-005, FR-MCP-008). `pm4:write` includes read. */
export const SCOPE_TEXT: Record<OAuthScope, string> = {
  "pm4:read": "Read your projects, tasks, logged time and reports",
  "pm4:write":
    "Log time, edit your time logs, create tasks, change a task's status and set your workday start"
};

/** The scopes as the lines to show: write brings read along, read first. */
export function scopeLines(scopes: OAuthScope[]): string[] {
  const write = scopes.includes("pm4:write");
  const read = write || scopes.includes("pm4:read");
  return [
    ...(read ? [SCOPE_TEXT["pm4:read"]] : []),
    ...(write ? [SCOPE_TEXT["pm4:write"]] : [])
  ];
}

/** A short label for a grant's access: "Read only" or "Read and write". */
export function accessLabel(scopes: OAuthScope[]): string {
  return scopes.includes("pm4:write") ? "Read and write" : "Read only";
}
