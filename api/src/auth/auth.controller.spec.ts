import type { Request } from "express";
import { vi } from "vitest";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

describe("AuthController", () => {
  const service = {
    start: vi.fn().mockResolvedValue("https://google.test/auth"),
    callback: vi.fn().mockResolvedValue("http://web.test/auth/callback?code=c"),
    exchangeCode: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn()
  };
  const controller = new AuthController(service as unknown as AuthService);

  it("start redirects (302) to Google", async () => {
    await expect(controller.start("/app", "UTC")).resolves.toEqual({
      url: "https://google.test/auth",
      statusCode: 302
    });
    expect(service.start).toHaveBeenCalledWith("/app", "UTC");
  });

  it("callback passes the parsed and the raw query", async () => {
    const req = {
      originalUrl: "/api/v1/auth/google/callback?code=c&state=a%2Fb",
      query: { code: "c", state: "a/b" }
    } as unknown as Request;

    await expect(controller.callback(req)).resolves.toEqual({
      url: "http://web.test/auth/callback?code=c",
      statusCode: 302
    });
    expect(service.callback).toHaveBeenCalledWith(
      { code: "c", state: "a/b" },
      "code=c&state=a%2Fb"
    );
  });

  it("callback without a query passes an empty raw query", async () => {
    const req = {
      originalUrl: "/api/v1/auth/google/callback",
      query: {}
    } as unknown as Request;

    await controller.callback(req);
    expect(service.callback).toHaveBeenLastCalledWith({}, "");
  });

  it("token, refresh, logout and logout-all delegate to the service", async () => {
    await controller.token({ code: "c" });
    await controller.refresh({ refreshToken: "r" });
    await controller.logout({ refreshToken: "r" });
    await controller.logoutAll({ id: "user-1" });

    expect(service.exchangeCode).toHaveBeenCalledWith("c");
    expect(service.refresh).toHaveBeenCalledWith("r");
    expect(service.logout).toHaveBeenCalledWith("r");
    expect(service.logoutAll).toHaveBeenCalledWith("user-1");
  });
});
