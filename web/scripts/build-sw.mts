import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export type SwBuild = { version: string; urls: string[] };

/** Every file under `dir`, relative, with "/" separators, sorted (default string sort). */
export function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => relative(dir, join(d.parentPath, d.name)).split(sep).join("/"))
    .sort();
}

/** Out-relative paths → the URLs the worker precaches: "/" + path, sorted. Leaves out "sw.js" and every path
 *  that is "_not-found…" or starts with "_not-found/" (Next's internal copy; Pages serves 404.html). */
export function precacheUrls(files: readonly string[]): string[] {
  return files
    .filter((f) => f !== "sw.js" && !f.startsWith("_not-found"))
    .map((f) => `/${f}`)
    .sort();
}

/** sha256 over each entry, in the given order, of `url + "\n" + sha256hex(content) + "\n"`; the first 16 hex characters. */
export function buildVersion(
  entries: readonly { url: string; content: Uint8Array }[]
): string {
  const hash = createHash("sha256");
  for (const { url, content } of entries) {
    const fileHash = createHash("sha256").update(content).digest("hex");
    hash.update(`${url}\n${fileHash}\n`);
  }
  return hash.digest("hex").slice(0, 16);
}

/** `self.__PM4_BUILD = ${JSON.stringify(build)};\n` followed by `workerSource` unchanged. */
export function renderServiceWorker(
  build: SwBuild,
  workerSource: string
): string {
  return `self.__PM4_BUILD = ${JSON.stringify(build)};\n${workerSource}`;
}

/** Lists `outDir`, builds { version, urls } (version from each url's file in outDir), writes `<outDir>/sw.js`
 *  from the worker source at `workerPath`, and returns the build. */
export function writeServiceWorker(
  outDir: string,
  workerPath: string
): SwBuild {
  const urls = precacheUrls(listFiles(outDir));
  const version = buildVersion(
    urls.map((url) => ({
      url,
      content: readFileSync(join(outDir, url.slice(1)))
    }))
  );
  const build: SwBuild = { version, urls };
  writeFileSync(
    join(outDir, "sw.js"),
    renderServiceWorker(build, readFileSync(workerPath, "utf8"))
  );
  return build;
}

// Run directly (`node scripts/build-sw.mts` from web/):
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const build = writeServiceWorker("out", "sw/service-worker.js");
  console.log(
    `sw.js: ${build.urls.length} files precached, version ${build.version}`
  );
}
