// Acceptance tests for feat-shell-documentation (specs/06-features/shell-documentation.md).
// Run: node --test scripts/changelog.ac.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { buildChangelog, changeFor } from "./changelog.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "changelog.mjs");

// Isolated from the user's git config (signing, hooks, default branch).
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

const tmpDirs = [];
after(() => tmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function tmpDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pm4-changelog-"));
  tmpDirs.push(d);
  return d;
}

function git(repo, ...args) {
  const r = spawnSync("git", args, { cwd: repo, env: GIT_ENV, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

/** Writes (or rewrites) a file in the repo and commits it with `message`. */
function commit(repo, file, message) {
  const p = path.join(repo, file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, `${message}\n`);
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", message);
}

function initRepo() {
  const repo = tmpDir();
  git(repo, "init", "-q", "-b", "main");
  return repo;
}

/** Runs the CLI in `cwd`; returns { status, stdout, stderr }. */
function run(cwd, ...args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: GIT_ENV, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** A release's changes without hashes, sorted by description (same-second commits have no stable order). */
function changesOf(release) {
  return release.changes
    .map(({ hash, ...rest }) => {
      assert.match(hash, /^[0-9a-f]{7,}$/);
      return rest;
    })
    .sort((a, b) => a.description.localeCompare(b.description));
}

describe("feat-shell-documentation: changelog script", () => {
  it("AC-1 OQ-270 OQ-271: changeFor keeps feat, fix and breaking commits and parses type, scope and description", () => {
    const hash = "abc1234";
    assert.deepEqual(changeFor({ hash, message: "feat(web): a" }), {
      type: "feat",
      scope: "web",
      description: "a",
      breaking: false,
      hash,
    });
    assert.deepEqual(changeFor({ hash, message: "fix: b" }), {
      type: "fix",
      scope: null,
      description: "b",
      breaking: false,
      hash,
    });
    assert.deepEqual(changeFor({ hash, message: "feat(): c" }), {
      type: "feat",
      scope: null,
      description: "c",
      breaking: false,
      hash,
    });
    for (const message of ["chore: d", "docs(api): e", "Update README"]) {
      assert.equal(changeFor({ hash, message }), null, message);
    }
    assert.deepEqual(changeFor({ hash, message: "refactor(api)!: f" }), {
      type: "refactor",
      scope: "api",
      description: "f",
      breaking: true,
      hash,
    });
    assert.deepEqual(changeFor({ hash, message: "chore: g\n\nBREAKING CHANGE: x" }), {
      type: "chore",
      scope: null,
      description: "g",
      breaking: true,
      hash,
    });
    assert.deepEqual(changeFor({ hash, message: "fix!: h" }), {
      type: "fix",
      scope: null,
      description: "h",
      breaking: true,
      hash,
    });
  });

  it("AC-2 OQ-270: buildChangelog lists releases newest first with their app, counts hidden commits, and keeps all-hidden releases", () => {
    const result = buildChangelog("api", [
      {
        version: "0.0.1",
        tag: "api-v0.0.1",
        date: "2026-10-01",
        commits: [
          { hash: "1111111", message: "chore: hidden" },
          { hash: "2222222", message: "docs: hidden too" },
        ],
      },
      {
        version: "0.1.0",
        tag: "api-v0.1.0",
        date: "2026-10-02",
        commits: [
          { hash: "3333333", message: "fix(api): second" },
          { hash: "4444444", message: "chore: hidden" },
          { hash: "5555555", message: "feat(api): first" },
        ],
      },
    ]);
    assert.deepEqual(result, {
      items: [
        {
          app: "api",
          version: "0.1.0",
          tag: "api-v0.1.0",
          date: "2026-10-02",
          commitCount: 3,
          changes: [
            { type: "fix", scope: "api", description: "second", breaking: false, hash: "3333333" },
            { type: "feat", scope: "api", description: "first", breaking: false, hash: "5555555" },
          ],
        },
        {
          app: "api",
          version: "0.0.1",
          tag: "api-v0.0.1",
          date: "2026-10-01",
          commitCount: 2,
          changes: [],
        },
      ],
    });
  });

  it("AC-3 OQ-270: CLI builds each app's releases from tags, adds the release being shipped, ignores merge commits", () => {
    const repo = initRepo();
    commit(repo, "web/a.txt", "feat(web): init");
    git(repo, "tag", "web-v0.0.1");
    commit(repo, "web/a.txt", "feat(web): a");
    git(repo, "tag", "web-v0.1.0");
    commit(repo, "web/b.txt", "fix(web): b");
    commit(repo, "web/c.txt", "chore: c");
    commit(repo, "api/d.txt", "docs: d");
    git(repo, "checkout", "-q", "-b", "side");
    commit(repo, "web/side.txt", "fix(web): side");
    git(repo, "checkout", "-q", "main");
    git(repo, "merge", "-q", "--no-ff", "side", "-m", "feat!: merge side");

    const headDate = git(repo, "log", "-1", "--format=%cs", "HEAD");
    const dateOf = (tag) => git(repo, "log", "-1", "--format=%cs", tag);

    const assertWeb = (file) => {
      const { items } = readJson(file);
      assert.deepEqual(
        items.map((r) => [r.app, r.version, r.tag, r.commitCount]),
        [
          ["web", "0.1.1", "web-v0.1.1", 3],
          ["web", "0.1.0", "web-v0.1.0", 1],
          ["web", "0.0.1", "web-v0.0.1", 1],
        ],
      );
      assert.equal(items[0].date, headDate);
      assert.equal(items[1].date, dateOf("web-v0.1.0"));
      assert.equal(items[2].date, dateOf("web-v0.0.1"));
      assert.deepEqual(changesOf(items[0]), [
        { type: "fix", scope: "web", description: "b", breaking: false },
        { type: "fix", scope: "web", description: "side", breaking: false },
      ]);
      assert.deepEqual(changesOf(items[1]), [{ type: "feat", scope: "web", description: "a", breaking: false }]);
      assert.deepEqual(changesOf(items[2]), [{ type: "feat", scope: "web", description: "init", breaking: false }]);
    };

    const web = run(repo, "web", "out/web.json");
    assert.equal(web.status, 0, web.stderr);
    assert.match(web.stdout, /web changelog: 3 releases \(latest web-v0\.1\.1\)/);
    assertWeb(path.join(repo, "out/web.json"));

    const api = run(repo, "api", "api.json");
    assert.equal(api.status, 0, api.stderr);
    const { items: apiItems } = readJson(path.join(repo, "api.json"));
    assert.deepEqual(apiItems, [
      { app: "api", version: "0.0.1", tag: "api-v0.0.1", date: headDate, commitCount: 1, changes: [] },
    ]);

    git(repo, "tag", "web-v0.1.1");
    const tagged = run(repo, "web", "tagged.json");
    assert.equal(tagged.status, 0, tagged.stderr);
    assertWeb(path.join(repo, "tagged.json"));

    const sub = path.join(repo, "web");
    const fromSub = run(sub, "web", "sub.json");
    assert.equal(fromSub.status, 0, fromSub.stderr);
    assert.deepEqual(readJson(path.join(sub, "sub.json")), readJson(path.join(repo, "tagged.json")));
  });

  it("AC-4 OQ-270: CLI with no releases, missing arguments, or a malformed tag", () => {
    const repo = initRepo();
    commit(repo, "api/a.txt", "feat(api): only api");

    const empty = run(repo, "web", "web.json");
    assert.equal(empty.status, 0, empty.stderr);
    assert.deepEqual(readJson(path.join(repo, "web.json")), { items: [] });
    assert.match(empty.stdout, /web changelog: 0 releases/);

    assert.equal(run(repo).status, 1);
    assert.equal(run(repo, "web").status, 1);
    assert.equal(run(repo, "docs", "docs.json").status, 1);

    commit(repo, "web/a.txt", "feat(web): a");
    git(repo, "tag", "web-v1.2");
    assert.equal(run(repo, "web", "bad.json").status, 1);
  });
});
