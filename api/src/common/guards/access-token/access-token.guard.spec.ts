import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AccessTokenService } from "../../../auth/access-token.service.js";
import { AccessTokenGuard } from "./access-token.guard.js";

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request })
  } as unknown as ExecutionContext;
}

describe("AccessTokenGuard", () => {
  let isPublic: boolean | undefined;
  const verify = vi.fn<(token: string) => Promise<string | null>>();
  const reflector = {
    getAllAndOverride: () => isPublic
  } as unknown as Reflector;
  const guard = new AccessTokenGuard(reflector, {
    verify
  } as unknown as AccessTokenService);

  beforeEach(() => {
    isPublic = undefined;
    verify.mockReset();
  });

  it("lets @Public() routes through without a token", async () => {
    isPublic = true;
    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(
      true
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it("rejects a request without Authorization", async () => {
    await expect(
      guard.canActivate(contextFor({ headers: {} }))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a non-Bearer Authorization header", async () => {
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Basic abc" } }))
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it("rejects a token that does not verify", async () => {
    verify.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: "Bearer bad" } })
      )
    ).rejects.toThrow("Missing or invalid access token.");
  });

  it("sets request.user for a valid token (case-insensitive scheme)", async () => {
    verify.mockResolvedValue("user-1");
    const request: Record<string, unknown> = {
      headers: { authorization: "bearer good" }
    };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith("good");
    expect(request.user).toEqual({ id: "user-1" });
  });
});
