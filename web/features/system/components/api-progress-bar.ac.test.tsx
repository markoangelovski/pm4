import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";

/**
 * `./api-progress-bar` is promoted from the prototype in T1 (`pm4 promote`), so it is loaded at run time instead of
 * imported: the typecheck passes before it exists.
 */
const API_PROGRESS_BAR = "./api-progress-bar";
let ApiProgressBar!: () => ReactNode;
beforeAll(async () => {
  ({ ApiProgressBar } = (await import(/* @vite-ignore */ API_PROGRESS_BAR)) as {
    ApiProgressBar: () => ReactNode;
  });
});

const progress = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  providerProps: [] as Record<string, unknown>[]
}));

vi.mock("@bprogress/react", () => ({
  ProgressProvider: ({
    children,
    ...props
  }: { children?: ReactNode } & Record<string, unknown>) => {
    progress.providerProps.push(props);
    return <>{children}</>;
  },
  useProgress: () => ({ start: progress.start, stop: progress.stop })
}));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** TanStack Query notifies its observers on a timer: let it and React's effects run. */
async function settle() {
  await act(() => new Promise((r) => setTimeout(r, 20)));
}

function renderBar() {
  const client = createQueryClient();
  render(
    <QueryClientProvider client={client}>
      <ApiProgressBar />
    </QueryClientProvider>
  );
  // Idle on mount: whatever the first effect did, count from here.
  progress.start.mockClear();
  progress.stop.mockClear();
  return client;
}

describe("ApiProgressBar (SCR-009, feat-shell-api-progress)", () => {
  beforeEach(() => {
    progress.start.mockReset();
    progress.stop.mockReset();
    progress.providerProps.length = 0;
  });

  it("AC-1 SCR-009: a query starts the bar after 200 ms and its end stops it; overlapping queries start it once and stop it after the last", async () => {
    const client = renderBar();

    const one = deferred();
    let first!: Promise<unknown>;
    await act(async () => {
      first = client.fetchQuery({
        queryKey: ["ac-1", "one"],
        queryFn: () => one.promise.then(() => 1)
      });
    });
    await settle();
    expect(progress.start).toHaveBeenCalledTimes(1);
    expect(progress.start).toHaveBeenCalledWith(0, 200);
    expect(progress.stop).not.toHaveBeenCalled();

    await act(async () => {
      one.resolve();
      await first;
    });
    await settle();
    expect(progress.stop).toHaveBeenCalledTimes(1);

    progress.start.mockClear();
    progress.stop.mockClear();
    const a = deferred();
    const b = deferred();
    let qa!: Promise<unknown>;
    let qb!: Promise<unknown>;
    await act(async () => {
      qa = client.fetchQuery({
        queryKey: ["ac-1", "a"],
        queryFn: () => a.promise.then(() => "a")
      });
      qb = client.fetchQuery({
        queryKey: ["ac-1", "b"],
        queryFn: () => b.promise.then(() => "b")
      });
    });
    await settle();
    expect(progress.start).toHaveBeenCalledTimes(1);

    await act(async () => {
      a.resolve();
      await qa;
    });
    await settle();
    expect(progress.stop).not.toHaveBeenCalled();

    await act(async () => {
      b.resolve();
      await qb;
    });
    await settle();
    expect(progress.start).toHaveBeenCalledTimes(1);
    expect(progress.stop).toHaveBeenCalledTimes(1);
  });

  it("AC-2 SCR-009: a mutation in flight starts the bar, and stops it when it settles", async () => {
    const client = renderBar();

    const done = deferred();
    let run!: Promise<unknown>;
    await act(async () => {
      run = client
        .getMutationCache()
        .build(client, { mutationFn: () => done.promise })
        .execute(undefined);
    });
    await settle();
    expect(progress.start).toHaveBeenCalledTimes(1);
    expect(progress.start).toHaveBeenCalledWith(0, 200);
    expect(progress.stop).not.toHaveBeenCalled();

    await act(async () => {
      done.resolve();
      await run;
    });
    await settle();
    expect(progress.stop).toHaveBeenCalledTimes(1);
  });

  it("AC-3 SCR-009: the bar is 3px in the primary colour, without a spinner", () => {
    renderBar();
    expect(progress.providerProps.length).toBeGreaterThan(0);
    const props = progress.providerProps[progress.providerProps.length - 1];
    expect(props.color).toBe("var(--primary)");
    expect(props.height).toBe("3px");
    expect(props.options).toMatchObject({ showSpinner: false });
  });
});
