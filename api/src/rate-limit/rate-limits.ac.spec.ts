import type { Request } from "express";
import { DEFAULT_RATE_LIMITS, clientIp } from "./rate-limits.js";

/** A request with only what `clientIp` reads. */
function req(ip: string | undefined, remoteAddress?: string): Request {
  return { ip, socket: { remoteAddress } } as unknown as Request;
}

describe("Rate limits and client IP (feat-api-rate-limit)", () => {
  it("AC-13 NFR-004: DEFAULT_RATE_LIMITS are a 60 s window, google/callback/token 10, refresh/logout 30, user 300", () => {
    expect(DEFAULT_RATE_LIMITS).toEqual({
      windowMs: 60_000,
      limits: {
        google: 10,
        callback: 10,
        token: 10,
        refresh: 30,
        logout: 30,
        user: 300
      }
    });
  });

  it("AC-14 NFR-004: clientIp drops an IPv4 :port suffix and keeps a plain IPv4", () => {
    expect(clientIp(req("203.0.113.7:51234"))).toBe("203.0.113.7");
    expect(clientIp(req("203.0.113.7"))).toBe("203.0.113.7");
  });

  it("AC-14 NFR-004: clientIp counts IPv6 addresses by their /64, bracketed with a port or bare", () => {
    const bracketed = clientIp(req("[2001:db8::1]:443"));
    const bare = clientIp(req("2001:db8::2"));
    expect(bracketed).toBe(bare);
    expect(bracketed).not.toContain("[");
    expect(bracketed).not.toContain("]");
  });

  it("AC-14 NFR-004: clientIp falls back to the socket address when req.ip is undefined", () => {
    expect(clientIp(req(undefined, "198.51.100.1"))).toBe("198.51.100.1");
  });
});
