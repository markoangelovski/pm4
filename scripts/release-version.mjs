#!/usr/bin/env node
// Release version for one app (web | api) from its `<app>-v<semver>` tags and the conventional commits
// since the last one. No dependencies. Rules: specs/02-architecture/deployment.md#release-versions-oq-098
//
//   node scripts/release-version.mjs <web|api>
import path from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {"major" | "minor" | "patch" | "none"} Bump */

/** Paths whose commits count for each app (the same paths that trigger its deploy workflow). */
export const APP_PATHS = { web: ["web/", "api/openapi.json"], api: ["api/"] };

/**
 * Highest bump among full commit messages (subject + body).
 * @param {string[]} messages
 * @returns {Bump}
 */
export function bumpFor(messages) {
  throw new Error("not implemented (feat-ops-release-versions)");
}

/**
 * @param {string} version
 * @param {Bump} bump
 * @returns {string}
 */
export function bumpVersion(version, bump) {
  throw new Error("not implemented (feat-ops-release-versions)");
}

/**
 * @param {{ app: string, lastTag: string | null, messages: string[] }} input
 * @returns {{ previous: string, version: string, bump: Bump, tag: string | null }}
 */
export function nextRelease({ app, lastTag, messages }) {
  throw new Error("not implemented (feat-ops-release-versions)");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.error("not implemented (feat-ops-release-versions)");
  process.exit(1);
}
