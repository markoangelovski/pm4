import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { ServiceSelect } from "./service-select";

const api = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const res = (status: number) => new Response(null, { status });
const project = (
  services: { id: string; name: string; taskCount: number }[]
) => ({
  data: { id: "p1", title: "Website", services },
  response: res(200)
});

function renderSelect(projectId: string | null) {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(
    <ServiceSelect
      id="s"
      projectId={projectId}
      value={null}
      onChange={() => {}}
    />,
    { wrapper }
  );
}

describe("ServiceSelect: what the box says", () => {
  beforeEach(() => api.GET.mockReset());

  it("no project: Choose a project first, disabled", () => {
    renderSelect(null);
    expect(screen.getByRole("combobox")).toHaveTextContent(
      "Choose a project first"
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("a project with no services: This project has no services, disabled", async () => {
    api.GET.mockResolvedValue(project([]));
    renderSelect("p1");
    expect(
      await screen.findByText("This project has no services")
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("the project fetch fails: Couldn't load the services, disabled", async () => {
    api.GET.mockResolvedValue({
      error: { status: 500, title: "Error" },
      response: res(500)
    });
    renderSelect("p1");
    // useProject retries once (about 1 s) before it reports the error.
    expect(
      await screen.findByText("Couldn't load the services", undefined, {
        timeout: 3000
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("a project with services: No service, enabled", async () => {
    api.GET.mockResolvedValue(
      project([{ id: "s1", name: "QA", taskCount: 0 }])
    );
    renderSelect("p1");
    await vi.waitFor(() =>
      expect(screen.getByRole("combobox")).not.toBeDisabled()
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("No service");
  });
});
