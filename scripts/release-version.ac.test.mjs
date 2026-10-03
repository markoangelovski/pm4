// Acceptance tests for feat-ops-release-versions (specs/06-features/ops-release-versions.md).
// Run: node --test scripts/release-version.ac.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { bumpFor, bumpVersion, nextRelease } from "./release-version.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "release-version.mjs");

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
delete GIT_ENV.GITHUB_OUTPUT;

const tmpDirs = [];
after(() => tmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function tmpDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pm4-release-"));
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

function initRepo({ tags }) {
  const repo = tmpDir();
  git(repo, "init", "-q", "-b", "main");
  commit(repo, "web/a.txt", "chore: init web");
  commit(repo, "api/a.txt", "chore: init api");
  fs.writeFileSync(path.join(repo, "api/openapi.json"), "{}\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "chore: contract");
  if (tags) {
    git(repo, "tag", "web-v0.0.1");
    git(repo, "tag", "api-v0.0.1");
  }
  return repo;
}

/** Runs the CLI; returns { status, stdout, stderr, output } where output is the GITHUB_OUTPUT map. */
function run(cwd, ...args) {
  const outFile = path.join(tmpDir(), "github_output");
  fs.writeFileSync(outFile, "");
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    env: { ...GIT_ENV, GITHUB_OUTPUT: outFile },
    encoding: "utf8",
  });
  const output = {};
  for (const line of fs.readFileSync(outFile, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) output[line.slice(0, i)] = line.slice(i + 1);
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, output };
}

describe("feat-ops-release-versions", () => {
  it("AC-1: bumpFor picks the highest bump from conventional commits", () => {
    assert.equal(bumpFor(["feat: x"]), "minor");
    for (const m of ["fix: x", "chore(tooling): x", "test(web): x", "Update README"]) {
      assert.equal(bumpFor([m]), "patch", m);
    }
    assert.equal(bumpFor(["feat(web)!: x"]), "major");
    assert.equal(bumpFor(["fix: x\n\nBREAKING CHANGE: y"]), "major");
    assert.equal(bumpFor(["fix: x\n\nBREAKING-CHANGE: y"]), "major");
    assert.equal(bumpFor(["fix: x", "feat: x"]), "minor");
    assert.equal(bumpFor([]), "none");
  });

  it("AC-2: bumpVersion applies semver bumps", () => {
    assert.equal(bumpVersion("0.0.1", "patch"), "0.0.2");
    assert.equal(bumpVersion("0.0.1", "minor"), "0.1.0");
    assert.equal(bumpVersion("0.1.3", "minor"), "0.2.0");
    assert.equal(bumpVersion("0.2.3", "major"), "1.0.0");
    assert.equal(bumpVersion("0.2.3", "none"), "0.2.3");
    assert.throws(() => bumpVersion("1.2", "patch"));
  });

  it("AC-3: nextRelease derives version and tag from the last tag", () => {
    assert.deepEqual(nextRelease({ app: "web", lastTag: null, messages: ["feat: x"] }), {
      previous: "0.0.0",
      version: "0.1.0",
      bump: "minor",
      tag: "web-v0.1.0",
    });
    assert.deepEqual(nextRelease({ app: "api", lastTag: "api-v0.1.0", messages: [] }), {
      previous: "0.1.0",
      version: "0.1.0",
      bump: "none",
      tag: null,
    });
    assert.throws(() => nextRelease({ app: "web", lastTag: "web-v1.2", messages: [] }));
    assert.throws(() => nextRelease({ app: "docs", lastTag: null, messages: [] }));
  });

  it("AC-4: CLI counts each app's commits since its tag, ignoring merge commits", () => {
    const repo = initRepo({ tags: true });
    commit(repo, "web/b.txt", "feat(web): a");
    commit(repo, "api/b.txt", "fix(api): b");
    commit(repo, "api/openapi.json", "chore: c");
    git(repo, "checkout", "-q", "-b", "side");
    commit(repo, "web/side.txt", "fix(web): side");
    git(repo, "checkout", "-q", "main");
    git(repo, "merge", "-q", "--no-ff", "side", "-m", "feat!: merge side");

    const web = run(repo, "web");
    assert.equal(web.status, 0, web.stderr);
    assert.match(web.stdout, /web 0\.0\.1 → 0\.1\.0/);
    assert.deepEqual(web.output, { version: "0.1.0", tag: "web-v0.1.0", bump: "minor" });

    const api = run(repo, "api");
    assert.equal(api.status, 0, api.stderr);
    assert.match(api.stdout, /api 0\.0\.1 → 0\.0\.2/);
    assert.deepEqual(api.output, { version: "0.0.2", tag: "api-v0.0.2", bump: "patch" });

    const fromSub = run(path.join(repo, "web"), "web");
    assert.equal(fromSub.status, 0, fromSub.stderr);
    assert.deepEqual(fromSub.output, web.output);
  });

  it("AC-5: CLI with no new commits, no tag, or no argument", () => {
    const tagged = initRepo({ tags: true });
    commit(tagged, "api/c.txt", "feat(api): only api");
    const none = run(tagged, "web");
    assert.equal(none.status, 0, none.stderr);
    assert.deepEqual(none.output, { version: "0.0.1", tag: "", bump: "none" });

    const untagged = initRepo({ tags: false });
    const first = run(untagged, "web");
    assert.equal(first.status, 0, first.stderr);
    assert.deepEqual(first.output, { version: "0.0.1", tag: "web-v0.0.1", bump: "patch" });

    assert.equal(run(tagged).status, 1);
  });
});
