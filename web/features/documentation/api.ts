import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type ChangelogApp = components["schemas"]["ChangelogApp"];
export type ChangelogEntryDto = components["schemas"]["ChangelogEntryDto"];
export type ChangelogReleaseDto = components["schemas"]["ChangelogReleaseDto"];
type ChangelogResponseDto = components["schemas"]["ChangelogResponseDto"];

export const documentationKeys = {
  all: ["documentation"] as const,
  changelog: (app: ChangelogApp) =>
    [...documentationKeys.all, "changelog", app] as const
};

/** The web deploy's changelog file, at the site root (deployment.md#release-changelog-oq-270). */
export const WEB_CHANGELOG_URL = "/changelog.json";

/**
 * The web app's releases, newest first. Read from the static file the web deploy wrote with the build. A 404
 * means there is no file (a local build, D6): the list is empty.
 */
function useWebChangelog(
  enabled: boolean
): UseQueryResult<ChangelogReleaseDto[]> {
  return useQuery({
    queryKey: documentationKeys.changelog("web"),
    enabled,
    queryFn: async ({ signal }) => {
      const response = await fetch(WEB_CHANGELOG_URL, { signal });
      if (response.status === 404) return [];
      if (!response.ok) {
        throw new Error(`GET ${WEB_CHANGELOG_URL} failed (${response.status})`);
      }
      const body = (await response.json()) as ChangelogResponseDto;
      return body.items;
    }
  });
}

/** GET /api/v1/changelog: the API's releases, newest first, current with every API release. */
function useApiChangelog(
  enabled: boolean
): UseQueryResult<ChangelogReleaseDto[]> {
  return useQuery({
    queryKey: documentationKeys.changelog("api"),
    enabled,
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.GET("/api/v1/changelog", { signal });
      if (!data) throw new Error("GET /api/v1/changelog failed");
      return data.items;
    }
  });
}

/** One app's releases, newest first. Only the selected app's list is loaded. */
export function useChangelog(
  app: ChangelogApp
): UseQueryResult<ChangelogReleaseDto[]> {
  const web = useWebChangelog(app === "web");
  const api = useApiChangelog(app === "api");
  return app === "web" ? web : api;
}
