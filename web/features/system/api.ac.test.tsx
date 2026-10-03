import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { useApiVersion } from "./api";

const GET = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET }
}));

function setup() {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useApiVersion(), { wrapper });
  return { queryClient, ...hook };
}

describe("useApiVersion (feat-shell-sidebar-branding)", () => {
  beforeEach(() => {
    GET.mockReset();
  });

  it("AC-6 API-SYS-003: returns the version under the key [system, version]", async () => {
    GET.mockResolvedValue({ data: { version: "0.0.1" } });
    const { result, queryClient } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("0.0.1");
    expect(GET).toHaveBeenCalledWith("/api/v1/version", expect.anything());
    expect(queryClient.getQueryData(["system", "version"])).toBe("0.0.1");
  });

  it("AC-7 SCR-004: an error response or a network error ends in the error state after one call (no retry)", async () => {
    GET.mockResolvedValue({ error: { status: 500 } });
    const first = setup();
    await waitFor(() => expect(first.result.current.isError).toBe(true));
    expect(GET).toHaveBeenCalledTimes(1);
    first.unmount();

    GET.mockReset();
    GET.mockRejectedValue(new TypeError("Failed to fetch"));
    const second = setup();
    await waitFor(() => expect(second.result.current.isError).toBe(true));
    expect(GET).toHaveBeenCalledTimes(1);
  });
});
