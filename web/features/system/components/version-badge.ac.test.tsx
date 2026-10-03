import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VersionBadge } from "./version-badge";

type HookState = { isSuccess: boolean; isError: boolean; data?: string };

const hook = vi.hoisted(() => ({
  state: { isSuccess: false, isError: false } as HookState
}));

vi.mock("@/features/system/api", () => ({
  useApiVersion: () => hook.state
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "0.1.0");
});

afterEach(() => {
  vi.unstubAllEnvs();
  hook.state = { isSuccess: false, isError: false };
});

describe("VersionBadge (feat-shell-sidebar-branding)", () => {
  it.each([
    [
      "success",
      { isSuccess: true, isError: false, data: "0.0.1" },
      "Web v0.1.0 · API v0.0.1"
    ],
    ["pending", { isSuccess: false, isError: false }, "Web v0.1.0 · API …"],
    ["error", { isSuccess: false, isError: true }, "Web v0.1.0 · API —"]
  ])(
    "AC-8 SCR-004: %s → a v0.1.0 button named with the summary",
    (_label, state, summary) => {
      hook.state = state;
      render(<VersionBadge />);
      const pill = screen.getByRole("button", { name: summary });
      expect(pill).toHaveTextContent("v0.1.0");
    }
  );
});
