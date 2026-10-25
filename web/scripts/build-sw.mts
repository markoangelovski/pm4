export type SwBuild = { version: string; urls: string[] };

/** Every file under `dir`, relative, with "/" separators, sorted (default string sort). */
export function listFiles(dir: string): string[] {
  throw new Error("not implemented (feat-shell-pwa)");
}

/** Out-relative paths → the URLs the worker precaches: "/" + path, sorted. Leaves out "sw.js" and every path
 *  that is "_not-found…" or starts with "_not-found/" (Next's internal copy; Pages serves 404.html). */
export function precacheUrls(files: readonly string[]): string[] {
  throw new Error("not implemented (feat-shell-pwa)");
}

/** sha256 over each entry, in the given order, of `url + "\n" + sha256hex(content) + "\n"`; the first 16 hex characters. */
export function buildVersion(
  entries: readonly { url: string; content: Uint8Array }[]
): string {
  throw new Error("not implemented (feat-shell-pwa)");
}

/** `self.__PM4_BUILD = ${JSON.stringify(build)};\n` followed by `workerSource` unchanged. */
export function renderServiceWorker(
  build: SwBuild,
  workerSource: string
): string {
  throw new Error("not implemented (feat-shell-pwa)");
}

/** Lists `outDir`, builds { version, urls } (version from each url's file in outDir), writes `<outDir>/sw.js`
 *  from the worker source at `workerPath`, and returns the build. */
export function writeServiceWorker(
  outDir: string,
  workerPath: string
): SwBuild {
  throw new Error("not implemented (feat-shell-pwa)");
}
