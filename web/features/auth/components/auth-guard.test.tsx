import { Component, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { AuthGuard } from "./auth-guard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() })
}));

const session = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => Promise<string | null>>()
}));

vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  getAccessToken: session.getAccessToken,
  onSessionEnded: () => () => {}
}));

class Boundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <p>boundary: {this.state.error.message}</p>
    ) : (
      this.props.children
    );
  }
}

describe("AuthGuard unexpected errors", () => {
  it("surfaces a non-SessionUnavailableError in the error boundary", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    session.getAccessToken.mockRejectedValue(new Error("locks exploded"));
    render(
      <QueryClientProvider client={createQueryClient()}>
        <Boundary>
          <AuthGuard>app</AuthGuard>
        </Boundary>
      </QueryClientProvider>
    );
    await waitFor(() =>
      expect(screen.getByText("boundary: locks exploded")).toBeTruthy()
    );
  });
});
