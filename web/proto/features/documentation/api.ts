import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient, MOCK_LATENCY_MS } from "@/proto/mock/client";
import { changelogSeed } from "@/proto/mock/changelog";
import openApiSnapshot from "@/proto/mock/openapi.json";
import type { ChangelogApp, ChangelogReleaseDto } from "./proposed-types";

export type {
  ChangelogApp,
  ChangelogEntryDto,
  ChangelogReleaseDto
} from "./proposed-types";

export const documentationKeys = {
  all: ["documentation"] as const,
  changelog: (app: ChangelogApp) =>
    [...documentationKeys.all, "changelog", app] as const
};

/**
 * The web app's releases, newest first. MOCK: answered from the changelog seed. In production the web deploy
 * writes them into the static site with the build, so they are current with every web release.
 * pm4-twin: differs (the prototype can't serve the deploy's changelog.json; production fetches it)
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

/** An OpenAPI document, as Scalar takes it. */
export type OpenApiDocument = Record<string, unknown>;

/** The API's OpenAPI document, at the site root: the web deploy copies `api/openapi.json` there with the build. */
export const API_SPEC_URL = "/openapi.json";

/**
 * The API's OpenAPI document, or null when the build has none (a `404`, as on a local build). MOCK: answered from
 * a snapshot of `api/openapi.json`; production fetches `API_SPEC_URL`.
 */
export function useApiSpec(): UseQueryResult<OpenApiDocument | null> {
  return useQuery({
    queryKey: [...documentationKeys.all, "api-spec"] as const,
    staleTime: Infinity,
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
      return openApiSnapshot as OpenApiDocument;
    }
  });
}

/**
 * The bearer token "Test request" sends, so it calls the API as the signed-in user. MOCK: the prototype has no
 * session, so requests go out without one (the API answers `401`); production returns `getAccessToken()`.
 */
export async function getApiDocsAccessToken(): Promise<string | null> {
  return null;
}
