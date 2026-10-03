#!/usr/bin/env node
// Release version for one app (web | api) from its `<app>-v<semver>` tags and the conventional commits
// since the last one. No dependencies. Rules: specs/02-architecture/deployment.md#release-versions-oq-098
//
//   node scripts/release-version.mjs <web|api>
//
// Prints one line, and with GITHUB_OUTPUT set appends `version`, `tag` and `bump` for the workflow.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** @typedef {"major" | "minor" | "patch" | "none"} Bump */

/** Paths whose commits count for each app (the same paths that trigger its deploy workflow). */
export const APP_PATHS = { web: ["web/", "api/openapi.json"], api: ["api/"] };

const RANK = { none: 0, patch: 1, minor: 2, major: 3 };
const SUBJECT = /^(\w+)(\([^)]*\))?(!)?: /;
const BREAKING = /^BREAKING[ -]CHANGE:/m;
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Highest bump among full commit messages (subject + body). Subject `^(\w+)(\([^)]*\))?(!)?: ` :
 * `!` or a body line starting `BREAKING CHANGE:` / `BREAKING-CHANGE:` → "major"; type `feat` → "minor";
 * anything else, including a non-conventional subject → "patch". [] → "none".
 * @param {string[]} messages
 * @returns {Bump}
 */
export function bumpFor(messages) {
  /** @type {Bump} */
  let bump = "none";
  for (const message of messages) {
    const [subject, ...body] = message.split("\n");
    const m = SUBJECT.exec(subject);
    /** @type {Bump} */
    let b = "patch";
    if (m?.[3] || BREAKING.test(body.join("\n"))) b = "major";
    else if (m?.[1] === "feat") b = "minor";
    if (RANK[b] > RANK[bump]) bump = b;
  }
  return bump;
}

/**
 * "0.1.3" + "minor" → "0.2.0"; "none" → unchanged. Throws on a version that isn't `\d+.\d+.\d+`.
 * @param {string} version
 * @param {Bump} bump
 * @returns {string}
 */
export function bumpVersion(version, bump) {
  const m = SEMVER.exec(version);
  if (!m) throw new Error(`not a semver version: ${version}`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  return version;
}

/**
 * lastTag `null` → previous "0.0.0". tag = `${app}-v${version}` when bump !== "none", else null.
 * Throws on an unknown app or a tag that isn't `${app}-v\d+.\d+.\d+`.
 * @param {{ app: string, lastTag: string | null, messages: string[] }} input
 * @returns {{ previous: string, version: string, bump: Bump, tag: string | null }}
 */
export function nextRelease({ app, lastTag, messages }) {
  if (!Object.hasOwn(APP_PATHS, app)) throw new Error(`unknown app: ${app} (expected web or api)`);
  let previous = "0.0.0";
  if (lastTag !== null) {
    const prefix = `${app}-v`;
    previous = lastTag.startsWith(prefix) ? lastTag.slice(prefix.length) : "";
    if (!SEMVER.test(previous)) throw new Error(`malformed tag: ${lastTag} (expected ${prefix}<major>.<minor>.<patch>)`);
  }
  const bump = bumpFor(messages);
  const version = bumpVersion(previous, bump);
  return { previous, version, bump, tag: bump === "none" ? null : `${app}-v${version}` };
}

// ---------- CLI ----------

function git(cwd, args) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function main(app) {
  if (!app || !Object.hasOwn(APP_PATHS, app)) throw new Error("usage: node scripts/release-version.mjs <web|api>");
  const top = git(process.cwd(), ["rev-parse", "--show-toplevel"]);
  if (top.status !== 0) throw new Error(`not inside a git repository: ${top.stderr.trim()}`);
  const root = top.stdout.trim();

  const described = git(root, ["describe", "--tags", "--abbrev=0", "--match", `${app}-v[0-9]*`, "HEAD"]);
  const lastTag = described.status === 0 ? described.stdout.trim() : null;

  const range = lastTag ? [`${lastTag}..HEAD`] : [];
  const log = git(root, ["log", "--no-merges", "--format=%B%x1e", ...range, "--", ...APP_PATHS[app]]);
  if (log.status !== 0) throw new Error(`git log failed: ${log.stderr.trim()}`);
  const messages = log.stdout
    .split("\x1e")
    .map((m) => m.trim())
    .filter(Boolean);

  const r = nextRelease({ app, lastTag, messages });
  console.log(
    r.tag
      ? `${app} ${r.previous} → ${r.version} (${r.bump}, ${messages.length} commits)`
      : `${app} ${r.version} (${lastTag ? `no changes since ${lastTag}` : "no changes, no tag yet"})`,
  );
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${r.version}\ntag=${r.tag ?? ""}\nbump=${r.bump}\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv[2]);
  } catch (e) {
    console.error(`release-version: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
