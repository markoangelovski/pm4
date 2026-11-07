import type { UseQueryResult } from "@tanstack/react-query";

// Stub (feat-shell-documentation): local copies of proto/features/documentation/proposed-types.ts until
// T-0151 replaces them with the generated schema types.

/** A released app: the web app and the API are versioned separately. */
export type ChangelogApp = "web" | "api";

/** One user-visible change: a `feat` or `fix` commit, or any commit marked breaking (OQ-271). */
export type ChangelogEntryDto = {
  type: string;
  scope: string | null;
  description: string;
  breaking: boolean;
  hash: string;
};

/** One release of one app, newest first in the list. */
export type ChangelogReleaseDto = {
  app: ChangelogApp;
  version: string;
  tag: string;
  date: string;
  commitCount: number;
  changes: ChangelogEntryDto[];
};

export const documentationKeys = {
  all: ["documentation"] as const,
  changelog: (app: ChangelogApp) =>
    [...documentationKeys.all, "changelog", app] as const
};

/** The web deploy's changelog file, at the site root (deployment.md#release-changelog-oq-270). */
export const WEB_CHANGELOG_URL = "/changelog.json";

/** One app's releases, newest first. Only the selected app's list is loaded. */
export function useChangelog(
  app: ChangelogApp
): UseQueryResult<ChangelogReleaseDto[]> {
  void app;
  throw new Error("not implemented (feat-shell-documentation)");
}
