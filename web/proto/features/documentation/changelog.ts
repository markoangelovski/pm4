import type { ChangelogApp, ChangelogEntryDto } from "./api";

/** A workflow reference in a commit subject: T-0147, T-0125…T-0128, OQ-196, feat-prj-lists (optionally " D5"). */
const REFERENCE =
  /^(T-\d{4}(\s*[…–-]+\s*T-\d{4})?|OQ-\d+|ADR-\d+|feat-[a-z0-9-]+(\s+D\d+)?)$/;

/**
 * The changelog text of a commit description: task, spec and open-question references are removed from
 * every parenthetical, and a parenthetical left empty is removed whole.
 * "full marketing page (T-0147)" → "full marketing page"; "(T-0063, push 2)" → "(push 2)".
 */
export function changelogText(description: string): string {
  return description
    .replace(/\s*\(([^()]*)\)/g, (match, inner: string) => {
      const kept = inner
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part !== "" && !REFERENCE.test(part));
      if (kept.length === inner.split(",").length) return match;
      return kept.length === 0 ? "" : ` (${kept.join(", ")})`;
    })
    .trim();
}

/** The scope label of a change, or null: a scope that just names the app being viewed is left out. */
export function changelogScope(
  change: ChangelogEntryDto,
  app: ChangelogApp
): string | null {
  return change.scope === null || change.scope === app ? null : change.scope;
}
