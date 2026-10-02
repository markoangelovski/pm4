import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ViewIdGuard } from "./view-id-guard";

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams
}));

describe("ViewIdGuard", () => {
  beforeEach(() => {
    replace.mockClear();
    searchParams = new URLSearchParams();
  });

  it("redirects (replace) to the list when id is missing", () => {
    render(
      <ViewIdGuard listPath="/projects/">
        <div>Project content</div>
      </ViewIdGuard>
    );

    expect(replace).toHaveBeenCalledWith("/projects/");
    expect(screen.queryByText("Project content")).not.toBeInTheDocument();
  });

  it("redirects (replace) to the list when id is empty", () => {
    searchParams = new URLSearchParams("id=");

    render(
      <ViewIdGuard listPath="/tasks/">
        <div>Task content</div>
      </ViewIdGuard>
    );

    expect(replace).toHaveBeenCalledWith("/tasks/");
    expect(screen.queryByText("Task content")).not.toBeInTheDocument();
  });

  it("renders the children and does not redirect when id is present", () => {
    searchParams = new URLSearchParams("id=abc-123");

    render(
      <ViewIdGuard listPath="/projects/">
        <div>Project content</div>
      </ViewIdGuard>
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Project content")).toBeInTheDocument();
  });
});
