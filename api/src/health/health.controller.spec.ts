import { HttpStatus } from '@nestjs/common';
import { vi } from 'vitest';
import type { Response } from 'express';
import { HealthController } from './health.controller.js';
import { HealthResult, HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: {
    check: ReturnType<typeof vi.fn<() => Promise<HealthResult>>>;
  };
  let res: { status: ReturnType<typeof vi.fn<(code: number) => void>> };

  beforeEach(() => {
    healthService = { check: vi.fn<() => Promise<HealthResult>>() };
    controller = new HealthController(
      healthService as unknown as HealthService,
    );
    res = { status: vi.fn<(code: number) => void>() };
  });

  it('responds 200 when healthy', async () => {
    healthService.check.mockResolvedValue({
      status: 'ok',
      db: 'up',
      redis: 'up',
    });

    const body = await controller.check(res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(body).toEqual({ status: 'ok', db: 'up', redis: 'up' });
  });

  it('responds 503 when a dependency is down', async () => {
    healthService.check.mockResolvedValue({
      status: 'error',
      db: 'up',
      redis: 'down',
    });

    const body = await controller.check(res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(body).toEqual({ status: 'error', db: 'up', redis: 'down' });
  });
});
