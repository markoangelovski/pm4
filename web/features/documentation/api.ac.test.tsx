import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import {
  useChangelog,
  type ChangelogApp,
  type ChangelogReleaseDto
} from "./api";

const GET = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET }
}));

const fetchMock = vi.fn();

const release = (app: ChangelogApp): ChangelogReleaseDto => ({
  app,
  version: "0.6.0",
  tag: `${app}-v0.6.0`,
  date: "2026-11-07",
  commitCount: 3,
  changes: [
    {
      type: "feat",
      scope: app,
      description: "documentation page",
      breaking: false,
      hash: "abc1234"
    }
  ]
});

/** The parts of a fetch Response the hook reads. */
function response(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

function setup(app: ChangelogApp) {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useChangelog(app), { wrapper });
  return { queryClient, ...hook };
}

describe("useChangelog (feat-shell-documentation)", () => {
  beforeEach(() => {
    GET.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC-10 SCR-053: web fetches /changelog.json and returns its items under [documentation, changelog, web]", async () => {
    const items = [release("web")];
    fetchMock.mockResolvedValue(response(200, { items }));
    const { result, queryClient } = setup("web");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(items);
    expect(fetchMock).toHaveBeenCalledWith(
      "/changelog.json",
      expect.anything()
    );
    expect(GET).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(["documentation", "changelog", "web"])
    ).toEqual(items);
  });

  it("AC-11 SCR-053: web 404 (no generated file) → success with []", async () => {
    fetchMock.mockResolvedValue(response(404));
    const { result } = setup("web");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("AC-11 SCR-053: web 500 → error state", async () => {
    fetchMock.mockResolvedValue(response(500));
    const { result } = setup("web");

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 4000
    });
  });

  it("AC-12 API-SYS-004 SCR-053: api calls GET /api/v1/changelog and returns its items under [documentation, changelog, api]", async () => {
    const items = [release("api")];
    GET.mockResolvedValue({ data: { items } });
    const { result, queryClient } = setup("api");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(items);
    expect(GET).toHaveBeenCalledWith("/api/v1/changelog", expect.anything());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(["documentation", "changelog", "api"])
    ).toEqual(items);
  });
});
