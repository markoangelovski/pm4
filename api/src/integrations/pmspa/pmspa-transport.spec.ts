import { Logger } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { PmspaHostGuard } from "./pmspa-host-guard.js";
import type { PmspaStore } from "./pmspa-store.js";
import { PmspaTransport, PmspaUnreachableError } from "./pmspa-transport.js";

function setup(
  fetchImpl: (...a: unknown[]) => Promise<Response>,
  opts: { guard?: "ok" | "private" | "unresolved"; paused?: number } = {}
) {
  const store = {
    pausedFor: vi.fn().mockResolvedValue(opts.paused ?? 0),
    pause: vi.fn().mockResolvedValue(undefined),
    getRateLimit: vi.fn().mockResolvedValue(null),
    setRateLimit: vi.fn().mockResolvedValue(undefined)
  };
  const guard = { check: vi.fn().mockResolvedValue(opts.guard ?? "ok") };
  const fetchFn = vi.fn(fetchImpl);
  const transport = new PmspaTransport(
    guard as unknown as PmspaHostGuard,
    store as unknown as PmspaStore,
    fetchFn
  );
  return { transport, store, guard, fetchFn };
}
const ok = () =>
  Promise.resolve(
    new Response(JSON.stringify({ a: 1 }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  );
const base = "https://pmspa.test/";

describe("PmspaTransport", () => {
  it("builds the url, sends the cookie and parses the body", async () => {
    const { transport, fetchFn } = setup(ok);
    const res = await transport.send({
      method: "GET",
      baseUrl: base,
      path: "/v1/x",
      query: { a: "1 2" },
      token: "tok"
    });
    expect(res).toMatchObject({ status: 200, body: { a: 1 } });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://pmspa.test/v1/x?a=1+2");
    expect(init.redirect).toBe("manual");
    expect((init.headers as Record<string, string>).Cookie).toBe(
      "auth=Bearer%20tok"
    );
  });

  it("throws rate-limited without calling when the host is paused", async () => {
    const { transport, fetchFn } = setup(ok, { paused: 30 });
    await expect(
      transport.send({ method: "GET", baseUrl: base, path: "/v1/x" })
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("is unreachable for a blocked host, a thrown fetch and a redirect", async () => {
    const req = { method: "GET", baseUrl: base, path: "/v1/x" } as const;
    await expect(
      setup(ok, { guard: "private" }).transport.send(req)
    ).rejects.toBeInstanceOf(PmspaUnreachableError);
    await expect(
      setup(() => Promise.reject(new TypeError("fetch failed"))).transport.send(
        req
      )
    ).rejects.toBeInstanceOf(PmspaUnreachableError);
    await expect(
      setup(() =>
        Promise.resolve(new Response(null, { status: 302 }))
      ).transport.send(req)
    ).rejects.toBeInstanceOf(PmspaUnreachableError);
  });

  it("pauses the host on 429 using Retry-After, default 900", async () => {
    const mk = (h: Record<string, string>) =>
      setup(() =>
        Promise.resolve(new Response("{}", { status: 429, headers: h }))
      );
    const a = mk({ "Retry-After": "42" });
    await expect(
      a.transport.send({ method: "GET", baseUrl: base, path: "/v1/x" })
    ).rejects.toMatchObject({ status: 503 });
    expect(a.store.pause).toHaveBeenCalledWith("pmspa.test", 42);
    const b = mk({});
    await expect(
      b.transport.send({ method: "GET", baseUrl: base, path: "/v1/x" })
    ).rejects.toMatchObject({ status: 503 });
    expect(b.store.pause).toHaveBeenCalledWith("pmspa.test", 900);
  });

  describe("observe (feat-int-budget)", () => {
    const req = { method: "GET", baseUrl: base, path: "/v1/x" } as const;
    const headers = (h: Record<string, string>, status = 200) =>
      Promise.resolve(new Response("{}", { status, headers: h }));

    it("keeps the X-RateLimit-* of an answer", async () => {
      const reset = String(Math.floor(Date.now() / 1000) + 60);
      const { transport, store } = setup(() =>
        headers({
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "40",
          "X-RateLimit-Reset": reset
        })
      );
      await transport.send(req);
      expect(store.setRateLimit).toHaveBeenCalledWith(
        "pmspa.test",
        expect.objectContaining({ limit: 100, remaining: 40 })
      );
    });

    it("a 429 stores remaining 0 with the stored limit, and still pauses and throws", async () => {
      const { transport, store } = setup(() =>
        headers({ "Retry-After": "30" }, 429)
      );
      store.getRateLimit.mockResolvedValue({ limit: 100 });
      await expect(transport.send(req)).rejects.toMatchObject({ status: 503 });
      expect(store.setRateLimit).toHaveBeenCalledWith(
        "pmspa.test",
        expect.objectContaining({ limit: 100, remaining: 0 })
      );
      expect(store.pause).toHaveBeenCalledWith("pmspa.test", 30);
    });

    it("a 429 pauses the host before it stores the answer", async () => {
      const { transport, store } = setup(() =>
        headers({ "X-RateLimit-Limit": "100", "Retry-After": "900" }, 429)
      );
      await expect(transport.send(req)).rejects.toMatchObject({ status: 503 });
      expect(store.pause.mock.invocationCallOrder[0]).toBeLessThan(
        store.setRateLimit.mock.invocationCallOrder[0]
      );
    });

    it("a Redis failure only logs a warning and the response goes through", async () => {
      const reset = String(Math.floor(Date.now() / 1000) + 60);
      const { transport, store } = setup(() =>
        headers({
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "40",
          "X-RateLimit-Reset": reset
        })
      );
      store.setRateLimit.mockRejectedValue(new Error("redis down"));
      const warn = vi
        .spyOn(Logger.prototype, "warn")
        .mockImplementation(() => undefined);
      await expect(transport.send(req)).resolves.toMatchObject({
        status: 200
      });
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });
  });
});
