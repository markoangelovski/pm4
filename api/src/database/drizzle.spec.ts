import { vi } from 'vitest';
import { AppConfigService } from '../config/app-config.service.js';

// `vi.mock()` calls are hoisted above every import in this file (Vitest's
// static transform, not real Node ESM caching), so any variable a factory
// closes over is declared via `vi.hoisted()` to avoid a TDZ reference.
const { queryMock, endMock } = vi.hoisted(() => ({
  queryMock: vi.fn<(sql: string) => Promise<{ rows: unknown[] }>>(),
  endMock: vi.fn<() => Promise<void>>(),
}));

vi.mock('pg', () => {
  const Pool = vi.fn().mockImplementation(function () {
    return { query: queryMock, end: endMock };
  });
  // drizzle-orm's node-postgres driver does `import pg from 'pg'; pg.Pool`
  // (pg is CJS, `module.exports = { Pool, ... }`), so the mock needs both
  // the named and default export shaped the same way.
  return { Pool, default: { Pool } };
});

const { Drizzle } = await import('./drizzle.js');

describe('Drizzle', () => {
  let provider: InstanceType<typeof Drizzle>;

  beforeEach(() => {
    queryMock.mockReset();
    endMock.mockReset();
    provider = new Drizzle({
      databaseUrl: 'postgres://localhost:5432/pm4',
    } as unknown as AppConfigService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('ping resolves when the query succeeds within the timeout', async () => {
    queryMock.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    await expect(provider.ping(1000)).resolves.toBeUndefined();
    expect(queryMock).toHaveBeenCalledWith('SELECT 1');
  });

  it('ping rejects when the query does not resolve before the timeout', async () => {
    queryMock.mockImplementation(() => new Promise(() => {}));

    await expect(provider.ping(20)).rejects.toThrow(/timed out/);
  });

  it('ping rejects when the query errors', async () => {
    queryMock.mockRejectedValue(new Error('connection refused'));

    await expect(provider.ping(1000)).rejects.toThrow('connection refused');
  });

  it('onModuleDestroy closes the pool', async () => {
    endMock.mockResolvedValue(undefined);

    await provider.onModuleDestroy();

    expect(endMock).toHaveBeenCalled();
  });
});
