import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import type { components } from "@/lib/api/schema";
import { ConnectorsNav } from "./connectors-nav";

type Connection = components["schemas"]["PmspaConnectionResponseDto"];

const state = vi.hoisted(() => ({
  connection: undefined as Connection | undefined
}));

vi.mock("@/features/integrations/api", () => ({
  usePmspaConnection: () => ({ data: state.connection })
}));

// A plain anchor keeps the exact href (next.config isn't loaded in Vitest).
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app"
}));

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ state: "expanded" })
}));

const connection = (status: Connection["status"]): Connection => ({
  status,
  url: status === "not-configured" ? null : "https://pmspa.example.com",
  email: status === "not-configured" ? null : "me@example.com",
  account: null,
  lastCheckedAt: null,
  lastSyncAt: null,
  rateLimit: null
});

afterEach(() => {
  state.connection = undefined;
});

describe("ConnectorsNav (feat-int-web D4)", () => {
  it("AC-6 FR-INT-006: nothing while not configured; a Connectors heading and a PMSPA link once a connection is saved, whatever its status", () => {
    state.connection = connection("not-configured");
    const off = render(<ConnectorsNav />);
    expect(off.container).toBeEmptyDOMElement();
    off.unmount();

    state.connection = connection("invalid-credentials");
    render(<ConnectorsNav />);
    expect(screen.getByText("Connectors")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PMSPA" })).toHaveAttribute(
      "href",
      "/app/connectors/pmspa"
    );
  });
});
