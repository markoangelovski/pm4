import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Client } from "openapi-fetch";
import type { paths } from "@/lib/api/schema";
import { apiClient, MOCK_LATENCY_MS } from "@/proto/mock/client";
import { changelogSeed } from "@/proto/mock/changelog";
import type {
  ChangelogApp,
  ChangelogPaths,
  ChangelogReleaseDto
} from "./proposed-types";

export type {
  ChangelogApp,
  ChangelogEntryDto,
  ChangelogReleaseDto
} from "./proposed-types";

/** Until `npm run api:types` adds GET /api/v1/changelog to `paths`. */
const client = apiClient as unknown as Client<paths & ChangelogPaths>;

export const documentationKeys = {
  all: ["documentation"] as const,
  changelog: (app: ChangelogApp) =>
    [...documentationKeys.all, "changelog", app] as const
};

/**
 * The web app's releases, newest first. MOCK: answered from the changelog seed. In production the web deploy
 * writes them into the static site with the build, so they are current with every web release.
 */
function useWebChangelog(
  enabled: boolean
): UseQueryResult<ChangelogReleaseDto[]> {
  return useQuery({
    queryKey: documentationKeys.changelog("web"),
    enabled,
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
      return changelogSeed.filter((r) => r.app === "web");
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
      const { data } = await client.GET("/api/v1/changelog", { signal });
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
