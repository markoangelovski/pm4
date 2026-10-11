import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { timeKeys } from "@/features/time/api";
import {
  reportKeys,
  useDashboardReport,
  useProjectCount,
  useTaskCounts,
  type DashboardReport
} from "./api";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const report: DashboardReport = {
  days: [
    {
      workDate: "2026-10-06",
      startMinute: 510,
      workedMinutes: 315,
      bookedMinutes: 120
    }
  ],
  projects: [
    {
      kind: "project",
      project: { id: "p-anthropic", title: "Anthropic", deleted: false },
      workedMinutes: 315,
      bookedMinutes: 120
    }
  ]
};

const res = (status: number) => new Response(null, { status });
const page = (total: number) => ({
  data: { items: [], total, page: 1, pageSize: 1 },
  response: res(200)
});

function setup<T>(hook: () => T) {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(hook, { wrapper }) };
}

type GetOptions = {
  params: { query: Record<string, unknown> };
};
const statusOf = (options: GetOptions) => {
  const status = options.params.query.status;
  return Array.isArray(status) ? status[0] : status;
};

describe("dashboard hooks (feat-rpt-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it("AC-6 FR-RPT-001 FR-RPT-006: GET /reports/dashboard with the range, the project and task counts, keys under timeKeys.all", async () => {
    expect(reportKeys.all.slice(0, timeKeys.all.length)).toEqual([
      ...timeKeys.all
    ]);
    expect(reportKeys.dashboard("2026-10-01", "2026-10-31")).toEqual([
      ...reportKeys.all,
      "dashboard",
      "2026-10-01",
      "2026-10-31"
    ]);

    // useDashboardReport → API-RPT-001.
    api.GET.mockResolvedValueOnce({ data: report, response: res(200) });
    const r = setup(() => useDashboardReport("2026-10-01", "2026-10-31"));
    await waitFor(() => expect(r.result.current.isSuccess).toBe(true));
    expect(r.result.current.data).toEqual(report);
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/reports/dashboard",
      expect.objectContaining({
        params: expect.objectContaining({
          query: { from: "2026-10-01", to: "2026-10-31" }
        })
      })
    );
    r.unmount();

    // useProjectCount → one-row project list, its total.
    api.GET.mockReset();
    api.GET.mockResolvedValueOnce(page(12));
    const p = setup(useProjectCount);
    await waitFor(() => expect(p.result.current.count).toBe(12));
    expect(p.result.current.isError).toBe(false);
    expect(api.GET).toHaveBeenCalledTimes(1);
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/projects",
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ pageSize: 1 })
        })
      })
    );
    p.unmount();

    // useTaskCounts → one one-row task list per status.
    api.GET.mockReset();
    const totals: Record<string, number> = {
      upcoming: 2,
      "in-progress": 3,
      completed: 4
    };
    api.GET.mockImplementation((_path: string, options: GetOptions) =>
      Promise.resolve(page(totals[statusOf(options) as string]))
    );
    const t = setup(useTaskCounts);
    await waitFor(() =>
      expect(t.result.current.counts).toEqual({
        upcoming: 2,
        "in-progress": 3,
        completed: 4
      })
    );
    expect(t.result.current.isError).toBe(false);
    expect(api.GET).toHaveBeenCalledTimes(3);
    for (const call of api.GET.mock.calls) {
      expect(call[0]).toBe("/api/v1/tasks");
      expect((call[1] as GetOptions).params.query).toMatchObject({
        pageSize: 1
      });
    }
    expect(
      api.GET.mock.calls.map((call) => statusOf(call[1] as GetOptions)).sort()
    ).toEqual(["completed", "in-progress", "upcoming"]);
  });
});
