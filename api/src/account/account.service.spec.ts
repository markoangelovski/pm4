import { Logger, UnauthorizedException } from "@nestjs/common";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance
} from "vitest";
import type { SessionStore } from "../auth/session.store.js";
import type { PmspaStore } from "../integrations/pmspa/pmspa-store.js";
import type { UsersRepository } from "../users/users.repository.js";
import { AccountService } from "./account.service.js";

describe("AccountService.deleteAccount", () => {
  const userId = "user-1";
  let usersRepository: { deleteAccount: ReturnType<typeof vi.fn> };
  let sessions: { revokeAll: ReturnType<typeof vi.fn> };
  let pmspaStore: { clear: ReturnType<typeof vi.fn> };
  let warn: MockInstance;
  let service: AccountService;

  beforeEach(() => {
    usersRepository = { deleteAccount: vi.fn().mockResolvedValue(true) };
    sessions = { revokeAll: vi.fn().mockResolvedValue(undefined) };
    pmspaStore = { clear: vi.fn().mockResolvedValue(undefined) };
    warn = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    service = new AccountService(
      usersRepository as unknown as UsersRepository,
      sessions as unknown as SessionStore,
      pmspaStore as unknown as PmspaStore
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clears the PMSPA data and warns when revoking sessions fails", async () => {
    sessions.revokeAll.mockRejectedValue(new Error("redis down"));
    await expect(service.deleteAccount(userId)).resolves.toBeUndefined();
    expect(pmspaStore.clear).toHaveBeenCalledWith(userId);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("resolves with a warning when clearing the PMSPA data fails", async () => {
    pmspaStore.clear.mockRejectedValue(new Error("redis down"));
    await expect(service.deleteAccount(userId)).resolves.toBeUndefined();
    expect(sessions.revokeAll).toHaveBeenCalledWith(userId);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("throws UnauthorizedException and cleans up nothing when the user is missing", async () => {
    usersRepository.deleteAccount.mockResolvedValue(false);
    await expect(service.deleteAccount(userId)).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    expect(sessions.revokeAll).not.toHaveBeenCalled();
    expect(pmspaStore.clear).not.toHaveBeenCalled();
  });

  it("calls both cleanups with the user id on the happy path", async () => {
    await expect(service.deleteAccount(userId)).resolves.toBeUndefined();
    expect(sessions.revokeAll).toHaveBeenCalledWith(userId);
    expect(pmspaStore.clear).toHaveBeenCalledWith(userId);
    expect(warn).not.toHaveBeenCalled();
  });
});
