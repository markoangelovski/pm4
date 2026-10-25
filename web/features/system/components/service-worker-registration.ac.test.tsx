import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ServiceWorkerRegistration } from "./service-worker-registration";

function stubServiceWorker(container: {
  register?: ReturnType<typeof vi.fn>;
  getRegistrations?: ReturnType<typeof vi.fn>;
}) {
  const value = {
    register: vi.fn(async () => ({})),
    getRegistrations: vi.fn(async () => []),
    ...container
  };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value
  });
  return value;
}

afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("ServiceWorkerRegistration (feat-shell-pwa)", () => {
  it("AC-12 D8: production → registers /sw.js once at scope / and renders nothing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const sw = stubServiceWorker({});

    const { container } = render(<ServiceWorkerRegistration />);

    await waitFor(() => expect(sw.register).toHaveBeenCalledTimes(1));
    expect(sw.register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
      updateViaCache: "none"
    });
    expect(sw.getRegistrations).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("AC-12 D8: production, a failing register raises nothing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const sw = stubServiceWorker({
      register: vi.fn(() => Promise.reject(new Error("SecurityError")))
    });

    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
    await waitFor(() => expect(sw.register).toHaveBeenCalledTimes(1));
  });

  it("AC-12 D8: a browser without service workers → no error", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect("serviceWorker" in navigator).toBe(false);

    const { container } = render(<ServiceWorkerRegistration />);

    expect(container).toBeEmptyDOMElement();
  });

  it("AC-12 D8: development → no register, every existing registration is removed", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const registrations = [
      { unregister: vi.fn(async () => true) },
      { unregister: vi.fn(async () => true) }
    ];
    const sw = stubServiceWorker({
      getRegistrations: vi.fn(async () => registrations)
    });

    const { container } = render(<ServiceWorkerRegistration />);

    await waitFor(() => {
      for (const r of registrations) expect(r.unregister).toHaveBeenCalled();
    });
    expect(sw.register).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
