import type { CimdFetcher } from "./cimd-fetcher.js";
import { ClientRegistry, type ResolvedClient } from "./client-registry.js";
import type { GrantsRepository } from "./grants.repository.js";
import type { OAuthStore } from "./oauth.store.js";

/** ResolvedClient gains logoUri in this feature (T1); read it without depending on the type. */
const logoOf = (client: ResolvedClient | null): unknown =>
  (client as unknown as { logoUri?: unknown } | null)?.logoUri;

const CLIENT_ID = "https://app.example.com/oauth/client.json";

function setup(opts: { doc?: unknown; cached?: unknown } = {}) {
  const fetcher = {
    isDevUrl: vi.fn(() => false),
    fetchJson: vi.fn(() => Promise.resolve(opts.doc))
  };
  const store = {
    getCachedClient: vi.fn(() => Promise.resolve(opts.cached ?? null)),
    cacheClient: vi.fn(() => Promise.resolve())
  };
  const repository = {};
  const registry = new ClientRegistry(
    fetcher as unknown as CimdFetcher,
    repository as unknown as GrantsRepository,
    store as unknown as OAuthStore
  );
  return { registry, fetcher, store };
}

const doc = (extra: Record<string, unknown>) => ({
  client_id: CLIENT_ID,
  client_name: "Example App",
  redirect_uris: ["https://app.example.com/cb"],
  ...extra
});

describe("ClientRegistry CIMD logo (feat-mcp-logos)", () => {
  it("AC-3 FR-MCP-003: a logo_uri on the client_id host is resolved and cached with the client", async () => {
    const logo = "https://app.example.com/logo.png";
    const { registry, store } = setup({ doc: doc({ logo_uri: logo }) });
    const client = await registry.resolve(CLIENT_ID);
    expect(client).not.toBeNull();
    expect(logoOf(client)).toBe(logo);
    expect(store.cacheClient).toHaveBeenCalledTimes(1);
    const calls = store.cacheClient.mock.calls as unknown as [
      string,
      ResolvedClient
    ][];
    expect(calls[0][0]).toBe(CLIENT_ID);
    expect(logoOf(calls[0][1])).toBe(logo);
  });

  it("AC-4 FR-MCP-003: a logo_uri on another host resolves with logoUri null", async () => {
    const { registry } = setup({
      doc: doc({ logo_uri: "https://cdn.example.net/logo.png" })
    });
    const client = await registry.resolve(CLIENT_ID);
    expect(client).not.toBeNull();
    expect(logoOf(client)).toBeNull();
  });

  it("AC-5 FR-MCP-003: a cached CIMD client without logoUri resolves with logoUri null", async () => {
    const cached = {
      clientId: CLIENT_ID,
      name: "Example App",
      clientIdHost: "app.example.com",
      redirectUris: ["https://app.example.com/cb"]
    };
    const { registry, fetcher } = setup({ cached });
    const client = await registry.resolve(CLIENT_ID);
    expect(client).toEqual({ ...cached, logoUri: null });
    expect(fetcher.fetchJson).not.toHaveBeenCalled();
  });
});
