// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ORIGIN = "https://pm4.example";
const VERSION = "0123456789abcdef";
const URLS = ["/index.html", "/app/projects.html", "/_next/static/chunks/a.js"];
const SOURCE = readFileSync(
  fileURLToPath(new URL("./service-worker.js", import.meta.url)),
  "utf8"
);

type Listener = (event: unknown) => void;

/** A minimal Cache: keys are absolute URLs; relative strings resolve against the worker's origin. */
class FakeCache {
  entries = new Map<string, Response>();
  addAll = vi.fn<(requests: Request[]) => Promise<void>>(async () => {});

  put(path: string, response: Response): void {
    this.entries.set(new URL(path, ORIGIN).href, response);
  }

  async match(
    request: Request | string,
    options: { ignoreSearch?: boolean } = {}
  ): Promise<Response | undefined> {
    const key = (u: string) => {
      const url = new URL(u, ORIGIN);
      if (options.ignoreSearch) url.search = "";
      return url.href;
    };
    const wanted = key(typeof request === "string" ? request : request.url);
    for (const [url, response] of this.entries) {
      if (key(url) === wanted) return response;
    }
    return undefined;
  }
}

let listeners: Map<string, Listener>;
let self: {
  __PM4_BUILD: { version: string; urls: string[] };
  location: { href: string; origin: string };
  addEventListener: (type: string, listener: Listener) => void;
  skipWaiting: ReturnType<typeof vi.fn>;
  clients: { claim: ReturnType<typeof vi.fn> };
};
let stores: Map<string, FakeCache>;
let caches: {
  open: ReturnType<typeof vi.fn>;
  keys: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};
let fetch: ReturnType<typeof vi.fn>;

function store(name: string): FakeCache {
  let cache = stores.get(name);
  if (!cache) {
    cache = new FakeCache();
    stores.set(name, cache);
  }
  return cache;
}

function listener(type: string): Listener {
  const found = listeners.get(type);
  if (!found) throw new Error(`the worker has no ${type} listener`);
  return found;
}

/** Runs a lifecycle event and waits for its waitUntil promise. */
async function lifecycle(type: "install" | "activate"): Promise<void> {
  let pending: Promise<unknown> | undefined;
  listener(type)({ waitUntil: (p: Promise<unknown>) => (pending = p) });
  expect(pending).toBeDefined();
  await pending;
}

/** Dispatches a fetch event; returns the promise given to respondWith, or undefined if it wasn't called. */
function dispatchFetch(request: {
  url: string;
  method?: string;
  mode?: string;
}): Promise<Response> | undefined {
  const respondWith = vi.fn();
  listener("fetch")({
    request: { method: "GET", mode: "cors", ...request },
    respondWith
  });
  return respondWith.mock.calls[0]?.[0] as Promise<Response> | undefined;
}

const offline = () => Promise.reject(new TypeError("Failed to fetch"));

beforeEach(() => {
  listeners = new Map();
  self = {
    __PM4_BUILD: { version: VERSION, urls: URLS },
    location: { href: `${ORIGIN}/sw.js`, origin: ORIGIN },
    addEventListener: (type, l) => listeners.set(type, l),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) }
  };
  stores = new Map();
  caches = {
    open: vi.fn(async (name: string) => store(name)),
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name))
  };
  fetch = vi.fn();
  new Function("self", "caches", "fetch", SOURCE)(self, caches, fetch);
});

describe("service worker (feat-shell-pwa)", () => {
  it("AC-5 D5: install precaches every URL with cache: reload into pm4-<version>, then skips waiting", async () => {
    await lifecycle("install");

    expect(caches.open).toHaveBeenCalledWith(`pm4-${VERSION}`);
    const cache = store(`pm4-${VERSION}`);
    expect(cache.addAll).toHaveBeenCalledTimes(1);
    const requests = cache.addAll.mock.calls[0][0];
    expect(requests.map((r) => r.url)).toEqual(URLS.map((u) => ORIGIN + u));
    for (const request of requests) {
      expect(request).toBeInstanceOf(Request);
      expect(request.cache).toBe("reload");
    }
    expect(self.skipWaiting).toHaveBeenCalledTimes(1);
    expect(self.skipWaiting.mock.invocationCallOrder[0]).toBeGreaterThan(
      cache.addAll.mock.invocationCallOrder[0]
    );
  });

  it("AC-6 D2: activate deletes older pm4- caches only, then claims the clients", async () => {
    store("pm4-old");
    store(`pm4-${VERSION}`);
    store("someone-elses-cache");

    await lifecycle("activate");

    expect(caches.delete).toHaveBeenCalledTimes(1);
    expect(caches.delete).toHaveBeenCalledWith("pm4-old");
    expect([...stores.keys()].sort()).toEqual(
      [`pm4-${VERSION}`, "someone-elses-cache"].sort()
    );
    expect(self.clients.claim).toHaveBeenCalledTimes(1);
    expect(self.clients.claim.mock.invocationCallOrder[0]).toBeGreaterThan(
      caches.delete.mock.invocationCallOrder[0]
    );
  });

  it("AC-7 D6: a navigation with the network up gets the network's response, also a 404", async () => {
    const ok = new Response("live page");
    const missing = new Response("not found", { status: 404 });
    fetch.mockResolvedValueOnce(ok).mockResolvedValueOnce(missing);

    await expect(
      dispatchFetch({ url: `${ORIGIN}/app/projects`, mode: "navigate" })
    ).resolves.toBe(ok);
    await expect(
      dispatchFetch({ url: `${ORIGIN}/nope`, mode: "navigate" })
    ).resolves.toBe(missing);
  });

  it("AC-8 D6 D7: a navigation with the network down gets the cached <path>.html, else /404.html", async () => {
    fetch.mockImplementation(offline);
    const cache = store(`pm4-${VERSION}`);
    const pages = {
      projects: new Response("projects"),
      index: new Response("index"),
      tasks: new Response("tasks"),
      notFound: new Response("404")
    };
    cache.put("/app/projects.html", pages.projects);
    cache.put("/index.html", pages.index);
    cache.put("/app/tasks.html", pages.tasks);
    cache.put("/404.html", pages.notFound);

    const navigate = (path: string) =>
      dispatchFetch({ url: ORIGIN + path, mode: "navigate" });

    await expect(navigate("/app/projects?id=1")).resolves.toBe(pages.projects);
    await expect(navigate("/")).resolves.toBe(pages.index);
    await expect(navigate("/app/tasks/")).resolves.toBe(pages.tasks);
    await expect(navigate("/nope")).resolves.toBe(pages.notFound);
  });

  it("AC-9 D6: /_next/static/** comes from the cache first, else from the network", async () => {
    const cached = new Response("cached chunk");
    store(`pm4-${VERSION}`).put("/_next/static/chunks/a.js", cached);

    await expect(
      dispatchFetch({ url: `${ORIGIN}/_next/static/chunks/a.js` })
    ).resolves.toBe(cached);
    expect(fetch).not.toHaveBeenCalled();

    const live = new Response("new chunk");
    fetch.mockResolvedValueOnce(live);
    await expect(
      dispatchFetch({ url: `${ORIGIN}/_next/static/chunks/b.js` })
    ).resolves.toBe(live);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("AC-10 D6: other same-origin GETs come from the network first, else the cache ignoring the query", async () => {
    const cached = new Response("cached rsc");
    store(`pm4-${VERSION}`).put("/app/projects.txt", cached);
    const rsc = `${ORIGIN}/app/projects.txt?_rsc=x`;

    const live = new Response("live rsc");
    fetch.mockResolvedValueOnce(live);
    await expect(dispatchFetch({ url: rsc })).resolves.toBe(live);

    fetch.mockImplementation(offline);
    await expect(dispatchFetch({ url: rsc })).resolves.toBe(cached);
    await expect(
      dispatchFetch({ url: `${ORIGIN}/icons/missing.png` })
    ).rejects.toThrow();
  });

  it("AC-11 D6: non-GET requests and other origins (the API) aren't intercepted", () => {
    expect(
      dispatchFetch({ url: `${ORIGIN}/app/projects`, method: "POST" })
    ).toBeUndefined();
    expect(
      dispatchFetch({ url: "https://pm4-api.example/api/v1/projects" })
    ).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
