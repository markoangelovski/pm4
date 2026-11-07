#!/usr/bin/env node
// Changelog for one app (web | api) from its `<app>-v<semver>` tags and conventional commits, including the
// release being shipped. No dependencies. Rules: specs/02-architecture/deployment.md#release-changelog-oq-270
//
//   node scripts/changelog.mjs <web|api> <out-file>
//
// Stub (feat-shell-documentation): T-0149 implements it.
import path from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {{ type: string, scope: string | null, description: string, breaking: boolean, hash: string }} ChangelogEntry */
/** @typedef {{ app: "web" | "api", version: string, tag: string, date: string, commitCount: number, changes: ChangelogEntry[] }} ChangelogRelease */
/** @typedef {{ hash: string, message: string }} Commit */

/**
 * One commit → its change, or null when the changelog hides it.
 * @param {Commit} _commit
 * @returns {ChangelogEntry | null}
 */
export function changeFor(_commit) {
  throw new Error("not implemented (feat-shell-documentation)");
}

/**
 * Releases oldest first → `{ items }` newest first.
 * @param {"web" | "api"} _app
 * @param {{ version: string, tag: string, date: string, commits: Commit[] }[]} _releases
 * @returns {{ items: ChangelogRelease[] }}
 */
export function buildChangelog(_app, _releases) {
  throw new Error("not implemented (feat-shell-documentation)");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.error("changelog: not implemented (feat-shell-documentation)");
  process.exit(1);
}
