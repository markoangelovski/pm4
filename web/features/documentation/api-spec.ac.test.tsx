import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { SessionUnavailableError } from "@/lib/auth/session";
import { getApiDocsAccessToken, useApiSpec } from "./api";

const GET = vi.hoisted(() => vi.fn());
const getAccessToken = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET }
}));

vi.mock("@/lib/auth/session", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/auth/session")>(
      "@/lib/auth/session"
    );
  return { ...actual, getAccessToken };
});

const fetchMock = vi.fn();

/** The parts of a fetch Response the hook reads. */
function response(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

function setup() {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useApiSpec(), { wrapper });
  return { queryClient, ...hook };
}

describe("useApiSpec (feat-shell-api-docs)", () => {
  beforeEach(() => {
    GET.mockReset();
    getAccessToken.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC-1 SCR-053: fetches /openapi.json and returns the parsed body under [documentation, api-spec]", async () => {
    const spec = { openapi: "3.1.0", info: { title: "PM4 API" }, paths: {} };
    fetchMock.mockResolvedValue(response(200, spec));
    const { result, queryClient } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(spec);
    expect(fetchMock).toHaveBeenCalledWith("/openapi.json", expect.anything());
    expect(queryClient.getQueryData(["documentation", "api-spec"])).toEqual(
      spec
    );
  });

  it("AC-2 SCR-053: a 404 (no generated file) → success with null", async () => {
    fetchMock.mockResolvedValue(response(404));
    const { result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("AC-2 SCR-053: a 500 → error state", async () => {
    fetchMock.mockResolvedValue(response(500));
    const { result } = setup();

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 4000
    });
  });
});

describe("getApiDocsAccessToken (feat-shell-api-docs)", () => {
  beforeEach(() => {
    getAccessToken.mockReset();
  });

  it("AC-3 SCR-053: getAccessToken resolves a token → that token", async () => {
    getAccessToken.mockResolvedValue("tok");
    await expect(getApiDocsAccessToken()).resolves.toBe("tok");
  });

  it("AC-3 SCR-053: getAccessToken resolves null → null", async () => {
    getAccessToken.mockResolvedValue(null);
    await expect(getApiDocsAccessToken()).resolves.toBeNull();
  });

  it("AC-3 SCR-053: SessionUnavailableError → null", async () => {
    getAccessToken.mockRejectedValue(new SessionUnavailableError());
    await expect(getApiDocsAccessToken()).resolves.toBeNull();
  });

  it("AC-3 SCR-053: any other error → rejects with it", async () => {
    const error = new Error("boom");
    getAccessToken.mockRejectedValue(error);
    await expect(getApiDocsAccessToken()).rejects.toBe(error);
  });
});
