import { vi } from "vitest";
import { Drizzle } from "../database/drizzle.js";
import { Redis } from "../redis/redis.js";
import { HealthService } from "./health.service.js";

type PingMock = ReturnType<typeof vi.fn<(timeoutMs: number) => Promise<void>>>;

describe("HealthService", () => {
  let service: HealthService;
  let drizzle: { ping: PingMock };
  let redis: { ping: PingMock };

  beforeEach(() => {
    drizzle = { ping: vi.fn<(timeoutMs: number) => Promise<void>>() };
    redis = { ping: vi.fn<(timeoutMs: number) => Promise<void>>() };
    service = new HealthService(
      drizzle as unknown as Drizzle,
      redis as unknown as Redis
    );
  });

  it("reports ok when both Postgres and Redis are up", async () => {
    drizzle.ping.mockResolvedValue(undefined);
    redis.ping.mockResolvedValue(undefined);

    await expect(service.check()).resolves.toEqual({
      status: "ok",
      db: "up",
      redis: "up"
    });
  });

  it("reports error and db:down when Postgres fails", async () => {
    drizzle.ping.mockRejectedValue(new Error("connection refused"));
    redis.ping.mockResolvedValue(undefined);

    await expect(service.check()).resolves.toEqual({
      status: "error",
      db: "down",
      redis: "up"
    });
  });

  it("reports error and redis:down when Redis fails", async () => {
    drizzle.ping.mockResolvedValue(undefined);
    redis.ping.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(service.check()).resolves.toEqual({
      status: "error",
      db: "up",
      redis: "down"
    });
  });

  it("reports error when both fail", async () => {
    drizzle.ping.mockRejectedValue(new Error("timeout"));
    redis.ping.mockRejectedValue(new Error("timeout"));

    await expect(service.check()).resolves.toEqual({
      status: "error",
      db: "down",
      redis: "down"
    });
  });

  it("checks Postgres and Redis in parallel, not sequentially", async () => {
    const order: string[] = [];
    drizzle.ping.mockImplementation(async () => {
      order.push("db-start");
      await new Promise((r) => setTimeout(r, 10));
      order.push("db-end");
    });
    redis.ping.mockImplementation(async () => {
      order.push("redis-start");
      await new Promise((r) => setTimeout(r, 1));
      order.push("redis-end");
    });

    await service.check();

    expect(order[0]).toBe("db-start");
    expect(order[1]).toBe("redis-start");
  });
});
