import { vi } from 'vitest';
import { AppConfigService } from '../config/app-config.service.js';

// `vi.mock()` calls are hoisted above every import in this file (Vitest's
// static transform, not real Node ESM caching), so any variable a factory
// closes over is declared via `vi.hoisted()` to avoid a TDZ reference.
const { pingMock, quitMock, onMock } = vi.hoisted(() => ({
  pingMock: vi.fn<() => Promise<string>>(),
  quitMock: vi.fn<() => Promise<void>>(),
  onMock: vi.fn<(event: string, cb: (...args: unknown[]) => void) => void>(),
}));

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(function () {
    return { ping: pingMock, quit: quitMock, on: onMock, status: 'wait' };
  }),
}));

const { Redis } = await import('./redis.js');

describe('Redis', () => {
  let provider: InstanceType<typeof Redis>;

  beforeEach(() => {
    pingMock.mockReset();
    quitMock.mockReset();
    onMock.mockReset();
    provider = new Redis({
      redisUrl: 'redis://localhost:6379',
    } as unknown as AppConfigService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('registers an error listener so an emitted error does not crash the process', () => {
    expect(onMock).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('ping resolves when PONG arrives within the timeout', async () => {
    pingMock.mockResolvedValue('PONG');

    await expect(provider.ping(1000)).resolves.toBeUndefined();
  });

  it('ping rejects when the client does not respond before the timeout', async () => {
    pingMock.mockImplementation(() => new Promise(() => {}));

    await expect(provider.ping(20)).rejects.toThrow(/timed out/);
  });

  it('ping rejects when the client errors', async () => {
    pingMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(provider.ping(1000)).rejects.toThrow('ECONNREFUSED');
  });

  it('onModuleDestroy quits the client unless it is already ended', async () => {
    quitMock.mockResolvedValue(undefined);

    await provider.onModuleDestroy();
    expect(quitMock).toHaveBeenCalled();
  });
});
