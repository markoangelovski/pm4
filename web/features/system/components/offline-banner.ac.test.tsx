import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { OfflineBanner } from "./offline-banner";

const MESSAGE =
  "You're offline. Data can't load or save until you're back online.";

function setOnline(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OfflineBanner (feat-shell-pwa)", () => {
  it("AC-14 SCR-006: online → renders nothing", () => {
    setOnline(true);

    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("AC-14 SCR-006: offline at mount → a status with the offline message", () => {
    setOnline(false);

    render(<OfflineBanner />);

    expect(screen.getByRole("status")).toHaveTextContent(MESSAGE);
  });

  it("AC-14 SCR-006: an offline event shows it, an online event hides it", () => {
    setOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(MESSAGE);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
