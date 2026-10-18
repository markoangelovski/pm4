import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import { ApiError } from "@/lib/api/problem";
import type { components } from "@/lib/api/schema";
import { SyncPreviewDialog } from "./sync-preview-dialog";

type S = components["schemas"];
type Props = ComponentProps<typeof SyncPreviewDialog>;

const problem = (
  status: number,
  slug: string,
  extensions: Record<string, unknown> = {}
) =>
  new ApiError(status, {
    type: `https://pm4.angelovski.top/errors/${slug}`,
    title: "Error",
    status,
    detail: "Error.",
    ...extensions
  });

/** A linked task whose title changed in PM4 only: the suggested side is PMSPA. */
const differs: S["SyncPreviewItemDto"] = {
  key: "task:t1",
  parentKey: null,
  type: "task",
  title: "Write the docs",
  detail: null,
  action: "differs",
  direction: "to-pmspa",
  reason: null,
  linkedId: "pmspa-t1",
  parent: false,
  optional: false,
  candidates: [],
  differences: [{ field: "Title", pm4: "Write the docs", pmspa: "Write docs" }],
  warnings: []
};

function renderDialog(over: Partial<Props> = {}) {
  const props: Props = {
    open: true,
    onOpenChange: vi.fn(),
    mode: "sync",
    title: "Sync Write the docs with PMSPA",
    description: "Both ways.",
    items: [differs],
    isPending: false,
    isError: false,
    error: null,
    onRetry: vi.fn(),
    onRun: vi.fn(),
    ...over
  };
  render(<SyncPreviewDialog {...props} />);
  return props;
}

const runButton = (name: RegExp) => screen.getByRole("button", { name });

describe("SyncPreviewDialog (feat-int-web)", () => {
  it("AC-7 FR-INT-012, OQ-173, OQ-174: a differs row preselects its direction; Link only writes nothing; Overwrite PMSPA sends the link choice; the result shows old → new", async () => {
    const onRun = vi.fn<Props["onRun"]>().mockResolvedValue({
      items: [
        {
          key: "task:t1",
          parentKey: null,
          type: "task",
          title: "Write docs",
          newTitle: "Write the docs",
          outcome: "updated",
          reason: null
        }
      ],
      syncedAt: "2026-10-15T20:50:00.000Z"
    });
    renderDialog({ onRun });

    expect(
      screen.getByRole("button", { name: "Overwrite PMSPA" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(runButton(/^Sync 1 record$/)).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Link only" }));
    expect(runButton(/^Sync 0 records$/)).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Overwrite PMSPA" }));
    expect(runButton(/^Sync 1 record$/)).toBeEnabled();
    fireEvent.click(runButton(/^Sync 1 record$/));

    expect(onRun).toHaveBeenCalledWith([
      { key: "task:t1", kind: "link", id: "pmspa-t1", overwrite: "to-pmspa" }
    ]);
    await waitFor(() =>
      expect(screen.getByLabelText("renamed to")).toBeInTheDocument()
    );
    expect(screen.getByText("Write docs")).toBeInTheDocument();
    expect(screen.getByText("Write the docs")).toBeInTheDocument();
  });

  it("AC-8 FR-INT-014, OQ-182: the preview error uses the PMSPA problem line", () => {
    renderDialog({
      items: undefined,
      isError: true,
      error: problem(503, "pmspa-rate-limited", { retryAfterSeconds: 600 })
    });
    expect(
      screen.getByText("PMSPA is busy. Try again in 10 minutes.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Couldn't prepare the preview/)
    ).not.toBeInTheDocument();
  });

  it("AC-8 FR-INT-014, OQ-182, OQ-199: a commit rejected with pmspa-sync-running keeps only the problem's line; another failure adds that records may have been written", async () => {
    renderDialog({
      onRun: vi
        .fn<Props["onRun"]>()
        .mockRejectedValue(problem(409, "pmspa-sync-running"))
    });
    fireEvent.click(runButton(/^Sync 1 record$/));
    expect(
      await screen.findByText("Another import, sync or push is still running.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Some records may have been written/)
    ).not.toBeInTheDocument();
    cleanup();

    renderDialog({
      onRun: vi
        .fn<Props["onRun"]>()
        .mockRejectedValue(problem(502, "pmspa-unreachable"))
    });
    fireEvent.click(runButton(/^Sync 1 record$/));
    expect(
      await screen.findByText(
        "PMSPA couldn't be reached. Some records may have been written: open the preview again to see where things stand."
      )
    ).toBeInTheDocument();
  });
});
