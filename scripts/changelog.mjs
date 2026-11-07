#!/usr/bin/env node
// Changelog for one app (web | api) from its `<app>-v<semver>` tags and conventional commits, including the
// release being shipped. No dependencies. Rules: specs/02-architecture/deployment.md#release-changelog-oq-270
//
//   node scripts/changelog.mjs <web|api> <out-file>
//
// Writes `{ items }` (newest release first) to <out-file>, relative to the current directory.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { APP_PATHS, nextRelease } from "./release-version.mjs";

/** @typedef {{ type: string, scope: string | null, description: string, breaking: boolean, hash: string }} ChangelogEntry */
/** @typedef {{ app: "web" | "api", version: string, tag: string, date: string, commitCount: number, changes: ChangelogEntry[] }} ChangelogRelease */
/** @typedef {{ hash: string, message: string }} Commit */

const SUBJECT = /^(\w+)(?:\(([^)]*)\))?(!)?: (.+)$/;
const BREAKING = /^BREAKING[ -]CHANGE:/m;
const SHOWN = new Set(["feat", "fix"]);

/**
 * One commit → its change, or null when the changelog hides it. Subject `^(\w+)(?:\(([^)]*)\))?(!)?: (.+)$`,
 * no match → null. breaking = `!`, or a body line starting `BREAKING CHANGE:` / `BREAKING-CHANGE:`.
 * Kept when type is `feat` or `fix`, or breaking. Empty scope → null.
 * @param {Commit} commit
 * @returns {ChangelogEntry | null}
 */
export function changeFor({ hash, message }) {
  const [subject, ...body] = message.split("\n");
  const m = SUBJECT.exec(subject.trim());
  if (!m) return null;
  const [, type, scope, bang, description] = m;
  const breaking = Boolean(bang) || BREAKING.test(body.join("\n"));
  if (!SHOWN.has(type) && !breaking) return null;
  return { type, scope: scope?.trim() || null, description: description.trim(), breaking, hash };
}

/**
 * Releases oldest first (commits newest first) → `{ items }` newest first.
 * @param {"web" | "api"} app
 * @param {{ version: string, tag: string, date: string, commits: Commit[] }[]} releases
 * @returns {{ items: ChangelogRelease[] }}
 */
export function buildChangelog(app, releases) {
  const items = releases
    .map(({ version, tag, date, commits }) => ({
      app,
      version,
      tag,
      date,
      commitCount: commits.length,
      changes: /** @type {ChangelogEntry[]} */ (commits.map(changeFor).filter(Boolean)),
    }))
    .reverse();
  return { items };
}

// ---------- CLI ----------

/** @param {string} cwd @param {string[]} args */
function git(cwd, args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr.trim()}`);
  return r.stdout;
}

/** @param {string} root @param {string[]} range @param {string[]} paths @returns {Commit[]} */
function commitsOf(root, range, paths) {
  return git(root, ["log", "--no-merges", "--format=%h%x1f%B%x1e", ...range, "--", ...paths])
    .split("\x1e")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const i = c.indexOf("\x1f");
      return { hash: c.slice(0, i).trim(), message: c.slice(i + 1).trim() };
    });
}

/** @param {string | undefined} app @param {string | undefined} outFile */
function main(app, outFile) {
  if (!app || !Object.hasOwn(APP_PATHS, app) || !outFile) {
    throw new Error("usage: node scripts/changelog.mjs <web|api> <out-file>");
  }
  const appName = /** @type {"web" | "api"} */ (app);
  const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim();
  const paths = APP_PATHS[appName];

  const tagPattern = new RegExp(`^${appName}-v(\\d+)\\.(\\d+)\\.(\\d+)$`);
  const tags = git(root, ["tag", "--merged", "HEAD", "--list", `${appName}-v[0-9]*`])
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((tag) => {
      const m = tagPattern.exec(tag);
      if (!m) throw new Error(`malformed tag: ${tag} (expected ${appName}-v<major>.<minor>.<patch>)`);
      return { tag, version: m.slice(1).join("."), parts: m.slice(1).map(Number) };
    })
    .sort((a, b) => a.parts[0] - b.parts[0] || a.parts[1] - b.parts[1] || a.parts[2] - b.parts[2]);

  const dateOf = (/** @type {string} */ ref) => git(root, ["log", "-1", "--format=%cs", ref]).trim();

  const releases = tags.map(({ tag, version }, i) => ({
    version,
    tag,
    date: dateOf(tag),
    commits: commitsOf(root, [i === 0 ? tag : `${tags[i - 1].tag}..${tag}`], paths),
  }));

  const lastTag = tags.at(-1)?.tag ?? null;
  const pending = commitsOf(root, [lastTag ? `${lastTag}..HEAD` : "HEAD"], paths);
  const next = nextRelease({ app: appName, lastTag, messages: pending.map((c) => c.message) });
  if (next.tag !== null) {
    releases.push({ version: next.version, tag: next.tag, date: dateOf("HEAD"), commits: pending });
  }

  const changelog = buildChangelog(appName, releases);
  const out = path.resolve(process.cwd(), outFile);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(changelog, null, 2) + "\n");
  const n = changelog.items.length;
  const latest = n ? ` (latest ${changelog.items[0].tag})` : "";
  console.log(`${appName} changelog: ${n} release${n === 1 ? "" : "s"}${latest} → ${outFile}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv[2], process.argv[3]);
  } catch (e) {
    console.error(`changelog: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
