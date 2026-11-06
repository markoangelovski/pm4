// PM4 service worker (feat-shell-pwa). postbuild prepends `self.__PM4_BUILD = { version, urls };` (scripts/build-sw.mts).
const { version, urls } = self.__PM4_BUILD;
const CACHE_PREFIX = "pm4-";
const CACHE = CACHE_PREFIX + version;

/** The precached page for a navigation: "/" → "/index.html", "/app/tasks/" → "/app/tasks.html". */
function pageFor(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return "/index.html";
  return path.endsWith(".html") ? path : `${path}.html`;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          urls.map(
            (url) =>
              new Request(new URL(url, self.location.href), { cache: "reload" })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function navigate(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE);
    const page =
      (await cache.match(pageFor(new URL(request.url).pathname))) ??
      (await cache.match("/404.html"));
    if (page) return page;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  return (await cache.match(request, { ignoreSearch: true })) ?? fetch(request);
}

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, {
      ignoreSearch: true,
      ignoreVary: true
    });
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") event.respondWith(navigate(request));
  else if (url.pathname.startsWith("/_next/static/"))
    event.respondWith(cacheFirst(request));
  else event.respondWith(networkFirst(request));
});

// Desktop notifications (feat-tlog-desktop-notifications): pages post a `pm4-notify` message
// (features/system/desktop-notifications.ts); the worker sees every PM4 window.
const NOTIFY = "pm4-notify";
const NOTIFICATION_ICON = "/icons/icon-192.png";
const APP_URL = "/app";

function windowClients() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true });
}

/** Skipped while a PM4 window has the focus (onlyWhenAway), or while this tag already shows this key. */
async function notify({ title, body, tag, key, onlyWhenAway }) {
  if (onlyWhenAway && (await windowClients()).some((client) => client.focused))
    return;
  if (key !== null) {
    const showing = await self.registration.getNotifications({ tag });
    if (showing.some((notification) => notification.data?.key === key)) return;
  }
  await self.registration.showNotification(title, {
    body,
    tag,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    renotify: true,
    data: { url: APP_URL, key }
  });
}

self.addEventListener("message", (event) => {
  const message = event.data;
  if (message?.type !== NOTIFY) return;
  event.waitUntil(notify(message));
});

/** The PM4 window under /app, else any PM4 window, to the front; none → a new one at `url`. */
async function focusApp(url) {
  const windows = await windowClients();
  const app =
    windows.find((client) =>
      new URL(client.url).pathname.startsWith(APP_URL)
    ) ?? windows[0];
  if (app) return app.focus();
  return self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(focusApp(event.notification.data?.url ?? APP_URL));
});
