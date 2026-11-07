import type { ChangelogApp, ChangelogEntryDto } from "./api";

/**
 * The changelog text of a commit description: task, spec and open-question references are removed from
 * every parenthetical, and a parenthetical left empty is removed whole.
 * Stub (feat-shell-documentation): T-0151 replaces it with the prototype twin.
 */
export function changelogText(description: string): string {
  void description;
  throw new Error("not implemented (feat-shell-documentation)");
}

/** The scope label of a change, or null: a scope that just names the app being viewed is left out. */
export function changelogScope(
  change: ChangelogEntryDto,
  app: ChangelogApp
): string | null {
  void change;
  void app;
  throw new Error("not implemented (feat-shell-documentation)");
}
