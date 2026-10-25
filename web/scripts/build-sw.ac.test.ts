// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildVersion,
  precacheUrls,
  renderServiceWorker,
  writeServiceWorker
} from "./build-sw.mjs";

const bytes = (text: string) => new TextEncoder().encode(text);

let dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "pm4-build-sw-"));
  dirs.push(dir);
  return dir;
}

function put(root: string, file: string, content: string): void {
  const path = join(root, file);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs = [];
});

describe("build-sw (feat-shell-pwa)", () => {
  it("AC-1 D5: precacheUrls → every path with a leading /, sorted, without sw.js and Next's _not-found copy", () => {
    const files = [
      "index.html",
      "app.html",
      "app/projects.txt",
      "_next/static/chunks/a.js",
      "404.html",
      "_not-found.html",
      "_not-found/__next._tree.txt",
      "sw.js",
      "manifest.webmanifest",
      "icons/icon-192.png"
    ];

    expect(precacheUrls(files)).toEqual([
      "/404.html",
      "/_next/static/chunks/a.js",
      "/app.html",
      "/app/projects.txt",
      "/icons/icon-192.png",
      "/index.html",
      "/manifest.webmanifest"
    ]);
  });

  it("AC-2 D5: buildVersion is 16 hex characters and changes with any content byte or URL", () => {
    const entries = [
      { url: "/index.html", content: bytes("<html>home</html>") },
      { url: "/_next/static/chunks/a.js", content: bytes("console.log(1)") }
    ];
    const version = buildVersion(entries);

    expect(version).toMatch(/^[0-9a-f]{16}$/);
    expect(
      buildVersion([
        { url: "/index.html", content: bytes("<html>home</html>") },
        { url: "/_next/static/chunks/a.js", content: bytes("console.log(1)") }
      ])
    ).toBe(version);
    expect(
      buildVersion([
        entries[0],
        { url: "/_next/static/chunks/a.js", content: bytes("console.log(2)") }
      ])
    ).not.toBe(version);
    expect(
      buildVersion([
        entries[0],
        { url: "/_next/static/chunks/b.js", content: bytes("console.log(1)") }
      ])
    ).not.toBe(version);
  });

  it("AC-3 D5: renderServiceWorker prefixes the build to the worker source unchanged", () => {
    const source = "// worker\nself.addEventListener('install', () => {});\n";
    const build = { version: "0123456789abcdef", urls: ["/index.html"] };

    expect(renderServiceWorker(build, source)).toBe(
      'self.__PM4_BUILD = {"version":"0123456789abcdef","urls":["/index.html"]};\n' +
        source
    );
  });

  it("AC-4 D5: writeServiceWorker writes out/sw.js and returns every other file, versioned by content", () => {
    const out = tempDir();
    const src = tempDir();
    const workerPath = join(src, "service-worker.js");
    writeFileSync(workerPath, "// the worker\n");
    put(out, "index.html", "<html>home</html>");
    put(out, "app/projects.html", "<html>projects</html>");
    put(out, "_next/static/chunks/a.js", "console.log(1)");
    put(out, "sw.js", "// stale worker from the last build");

    const build = writeServiceWorker(out, workerPath);

    expect(build.urls).toEqual([
      "/_next/static/chunks/a.js",
      "/app/projects.html",
      "/index.html"
    ]);
    expect(build.version).toBe(
      buildVersion(
        build.urls.map((url) => ({
          url,
          content: readFileSync(join(out, url.slice(1)))
        }))
      )
    );
    expect(readFileSync(join(out, "sw.js"), "utf8")).toBe(
      renderServiceWorker(build, "// the worker\n")
    );

    put(out, "_next/static/chunks/a.js", "console.log(2)");
    const next = writeServiceWorker(out, workerPath);

    expect(next.urls).toEqual(build.urls);
    expect(next.version).not.toBe(build.version);
  });
});
