import { BadRequestException } from "@nestjs/common";
import { PmspaConnectionService } from "./pmspa-connection.service.js";
import { pmspaUrlProblem } from "./pmspa-url-policy.js";

describe("PmspaConnectionService", () => {
  const repo = {
    find: vi.fn(),
    upsert: vi.fn(),
    switchAccount: vi.fn(),
    countOtherAccountLinks: vi.fn(),
    setStatus: vi.fn(),
    delete: vi.fn()
  };
  const crypto = {
    encrypt: vi.fn((plain: string) => Buffer.from(plain)),
    decrypt: vi.fn((blob: Buffer) => blob.toString())
  };
  const client = { check: vi.fn() };
  const store = {
    setToken: vi.fn(),
    setAccount: vi.fn(),
    getAccount: vi.fn(),
    getRateLimit: vi.fn().mockResolvedValue(null),
    clear: vi.fn()
  };
  const guard = { check: vi.fn() };
  const config = { nodeEnv: "production" };

  const service = new PmspaConnectionService(
    repo as never,
    crypto as never,
    client as never,
    store as never,
    guard as never,
    config as never
  );
  const account = {
    id: "65f1a0c0ffee00000000000b",
    email: "y@pmspa.test",
    avatarUrl: null,
    role: "user" as const
  };
  const dto = {
    url: "https://pmspa.test",
    email: "y@pmspa.test",
    password: "s"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repo.find.mockResolvedValue(null);
    guard.check.mockResolvedValue("ok");
    store.getAccount.mockResolvedValue(null);
    repo.countOtherAccountLinks.mockResolvedValue(0);
  });

  it("refuses a URL that breaks the URL rule before any call", async () => {
    await expect(
      service.save("u", { ...dto, url: "http://pmspa.test" })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(client.check).not.toHaveBeenCalled();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("asks for the password when there is no row and none is given", async () => {
    await expect(
      service.save("u", { url: dto.url, email: dto.email })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("refuses an account switch with links unless confirmed", async () => {
    repo.find.mockResolvedValue({
      userId: "u",
      url: dto.url,
      email: dto.email,
      passwordEnc: Buffer.from("s"),
      status: "connected",
      pmspaUserId: "65f1a0c0ffee00000000000a",
      lastCheckedAt: new Date(),
      lastSyncAt: null
    });
    client.check.mockResolvedValue({
      status: "connected",
      token: "t",
      account
    });
    repo.countOtherAccountLinks.mockResolvedValue(2);

    await expect(service.save("u", dto)).rejects.toMatchObject({
      status: 409
    });
    expect(repo.upsert).not.toHaveBeenCalled();
    expect(repo.switchAccount).not.toHaveBeenCalled();

    repo.switchAccount.mockResolvedValue(undefined);
    repo.find.mockResolvedValueOnce({
      userId: "u",
      url: dto.url,
      email: dto.email,
      passwordEnc: Buffer.from("s"),
      status: "connected",
      pmspaUserId: "65f1a0c0ffee00000000000a",
      lastCheckedAt: new Date(),
      lastSyncAt: null
    });
    await service.save("u", { ...dto, confirmAccountSwitch: true });
    expect(repo.switchAccount).toHaveBeenCalledTimes(1);
  });

  const savedRow = {
    userId: "u",
    url: dto.url,
    email: dto.email,
    passwordEnc: Buffer.from("s"),
    status: "connected",
    pmspaUserId: account.id,
    lastCheckedAt: new Date(),
    lastSyncAt: null
  };

  it("clears the cache when a save does not end connected, keeps it when it does", async () => {
    client.check.mockResolvedValue({ status: "invalid-credentials" });
    await service.save("u", dto);
    expect(repo.upsert).toHaveBeenCalled();
    expect(store.clear).toHaveBeenCalledWith("u");
    expect(store.setToken).not.toHaveBeenCalled();

    vi.clearAllMocks();
    repo.countOtherAccountLinks.mockResolvedValue(0);
    guard.check.mockResolvedValue("ok");
    client.check.mockResolvedValue({
      status: "connected",
      token: "t",
      account
    });
    await service.save("u", dto);
    expect(store.setToken).toHaveBeenCalledWith("u", "t", {
      url: dto.url,
      email: dto.email
    });
    expect(store.clear).not.toHaveBeenCalled();
  });

  it("leaves the cache alone on a refused account switch", async () => {
    repo.find.mockResolvedValue({ ...savedRow, pmspaUserId: "other" });
    client.check.mockResolvedValue({
      status: "connected",
      token: "t",
      account
    });
    repo.countOtherAccountLinks.mockResolvedValue(1);
    await expect(service.save("u", dto)).rejects.toMatchObject({ status: 409 });
    expect(store.clear).not.toHaveBeenCalled();
  });

  it("clears the cache when a test does not connect or finds another account (D8)", async () => {
    repo.find.mockResolvedValue(savedRow);
    client.check.mockResolvedValue({ status: "unreachable" });
    await service.test("u");
    expect(store.clear).toHaveBeenCalledWith("u");

    vi.clearAllMocks();
    repo.find.mockResolvedValue(savedRow);
    client.check.mockResolvedValue({
      status: "connected",
      token: "t",
      account: { ...account, id: "another" }
    });
    await service.test("u");
    expect(repo.setStatus).toHaveBeenCalledWith("u", "invalid-credentials");
    expect(store.clear).toHaveBeenCalledWith("u");
  });

  describe("a stored password that no longer decrypts", () => {
    beforeEach(() => {
      repo.find.mockResolvedValue(savedRow);
      crypto.decrypt.mockImplementationOnce(() => {
        throw new Error("bad blob");
      });
    });

    it("save without a password asks for it and stores nothing", async () => {
      await expect(
        service.save("u", { url: dto.url, email: dto.email })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.upsert).not.toHaveBeenCalled();
      expect(client.check).not.toHaveBeenCalled();
    });

    it("test writes invalid-credentials, clears the cache, skips PMSPA", async () => {
      await service.test("u");
      expect(repo.setStatus).toHaveBeenCalledWith("u", "invalid-credentials");
      expect(store.clear).toHaveBeenCalledWith("u");
      expect(client.check).not.toHaveBeenCalled();
    });

    it("test of a missing row is still 404", async () => {
      repo.find.mockResolvedValue(null);
      await expect(service.test("u")).rejects.toMatchObject({ status: 404 });
    });

    it("save with a password does not decrypt the stored one", async () => {
      client.check.mockResolvedValue({ status: "unreachable" });
      await service.save("u", dto);
      expect(crypto.decrypt).not.toHaveBeenCalled();
    });
  });

  it("classifies only the URL syntax and protocol without DNS", () => {
    expect(pmspaUrlProblem("https://pmspa.test", "production")).toBeNull();
    expect(pmspaUrlProblem("https://localhost", "production")).toBe("private");
  });
});
