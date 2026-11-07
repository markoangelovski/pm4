---
id: feat-shell-documentation
title: "Documentation page: Versioning and Changelog tabs, with a changelog built by every deploy"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-07
milestone: M1
requirements: [SCR-053, API-SYS-004]
related: [arch-deployment, api-endpoints, web-screens, web-routing, feat-ops-release-versions, OQ-098, OQ-270, OQ-271, OQ-272]
prototype: d1c097f
---

# Documentation page: Versioning and Changelog tabs, with a changelog built by every deploy

## Goal
A **Documentation** link below Settings opens a page with one tab per topic (SCR-053): **Versioning** explains how
release versions are derived, **Changelog** lists every release of the web app or the API with its features, fixes
and breaking changes. Each deploy builds its own app's changelog from the same tags and commits as its release
version ([deployment.md#release-changelog-oq-270](../02-architecture/deployment.md#release-changelog-oq-270)), so
the list is current with every release; the API serves its own at API-SYS-004.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The changelog is built by each deploy from the release-version tags and commits, including the release it ships. Web: `changelog.json` in the static site; API: built into the package, served at `GET /api/v1/changelog`. | OQ-270 (owner, 2026-11-07) |
| D2 | Shown: Breaking changes / Features / Bug fixes from `feat`, `fix` and breaking commits; other types hidden; "Maintenance only" without visible changes; Web \| API toggle, Latest badge, date, change and commit counts, short hash, no links. | OQ-270 (owner), prototype `d1c097f` |
| D3 | The text drops task, spec and OQ IDs from parentheses (`changelogText`) and a scope equal to the viewed app (`changelogScope`), on display only; the files keep the full subject. | Owner, prototype `d1c097f` |
| D4 | A breaking commit of another type is listed under Breaking changes with its own type: `ChangelogEntry.type` is a string. | OQ-271 (owner, 2026-11-07) |
| D5 | API-SYS-004 is public and not rate limited, like API-SYS-003. | OQ-272 (owner, 2026-11-07) |
| D6 | No generated file (local dev and builds) → an empty list: the API serves `{items: []}`, the web treats a `404` as `[]`. | OQ-272 (owner, 2026-11-07) |
| D7 | The Versioning tab restates deployment.md#release-versions-oq-098 and changes with it (a note in that section says so). | Owner (2026-11-07) |
| D8 | A separate root script `scripts/changelog.mjs` reuses `APP_PATHS` and `nextRelease` from `release-version.mjs`, which stays unchanged. Both files have the same shape `{items}`, so the API serves its file as is. | Agent: one rule for "the release being shipped"; release-version's tests stay untouched |
| D9 | The API reads `changelog.json` from its working directory once at startup (`api/` locally and in tests, the package root on Azure); a malformed file stops startup, so `/health` fails and no tag is made. | Agent |
| D10 | The prototype's `api.ts` gets a `pm4-twin: differs` marker: the prototype can't serve the static file, production fetches it. | Agent: precedent `proto/features/auth/use-sign-out.ts` |

## Scope
**In:** the generator script and its deploy steps, API-SYS-004, the Documentation page (promoted from the
prototype) with its route and sidebar link.

**Non-goals** (implementers must not touch these):
- `scripts/release-version.mjs`, its tests, the version pill and API-SYS-003.
- `ci.yml` (PRs build no changelog), GitHub Releases, links to commits.
- An Auth tab (a later feature), any other documentation topic.
- `web/proto/mock/**`, `web/proto/lib/routes.ts`, `web/proto/mock/shell/proto-sidebar-items.ts`.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/02-architecture/deployment.md#release-versions-oq-098`, `#release-changelog-oq-270` | Version and changelog rules |
| `specs/03-api/endpoints.md#api-sys-004-api-changelog` | The contract (shapes, public, empty without a file) |
| `scripts/release-version.mjs`, `scripts/release-version.ac.test.mjs` | The style to copy for the script and its CLI tests; `APP_PATHS`, `nextRelease` to import |
| `api/src/version/` | Module, public unlimited controller, DTO style (copy for `changelog/`) |
| `api/src/time/dto/dashboard-report-response.dto.ts` | `@ApiProperty` for an enum (`enumName`), nullable fields and numbers |
| `api/test/version.ac.e2e-spec.ts` | e2e pattern for a public endpoint |
| `web/proto/features/documentation/api.ts` | The mock hooks: the real `api.ts` keeps these names, keys and shapes |
| `web/features/system/api.ts` | A real hook over `apiClient.GET` with `{ signal }` |
| `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`, `web/lib/routes.ts` | Where the link and route go |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
|  | `scripts/changelog.ac.test.mjs` | C | tests | Acceptance tests (`node --test`) |
|  | `scripts/changelog.mjs` | C | tests, T1 | Stub, then the script |
|  | `.github/workflows/web-deploy.yml` | M | T1 | Step `Changelog` |
|  | `.github/workflows/api-deploy.yml` | M | T1 | Step `Changelog`, staged file |
|  | `.gitignore` | M | T1 | The two generated files |
| api | `api/test/changelog.ac.e2e-spec.ts` | C | tests | Acceptance tests |
| api | `api/src/changelog/read-changelog.ac.spec.ts` | C | tests | Acceptance tests |
| api | `api/src/changelog/dto/changelog-response.dto.ts` | C | tests | Written in full in the test step (types only) |
| api | `api/src/changelog/read-changelog.ts` | C | tests, T2 | Stub, then the reader |
| api | `api/src/changelog/changelog.module.ts` | C | T2 | `npx nest g module changelog` |
| api | `api/src/changelog/changelog.controller.ts` | C | T2 | `npx nest g controller changelog` |
| api | `api/src/changelog/changelog.controller.spec.ts` | C | T2 | Generated with the controller |
| api | `api/src/app.module.ts` | M | T2 | The CLI adds `ChangelogModule` |
| api | `api/openapi.json` | M | T2 | `npm run openapi:export` |
| web | `web/features/documentation/changelog.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/documentation/api.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts` | M | tests | AC-2, AC-3 of feat-shell-sidebar-sections gain Documentation |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx` | M | tests | Its AC-6: Settings is no longer the footer's only link |
| web | `web/features/documentation/changelog.ts` | C | tests, T3 | Stub, then the twin (sed below) |
| web | `web/proto/features/documentation/changelog.ts` | M | tests | Types from `./api` (re-exported there), so its twin compiles |
| web | `web/features/documentation/api.ts` | C | tests, T3 | Stub, then the real hooks |
| web | `proto/features/documentation/components/documentation-view.tsx` → `features/documentation/components/documentation-view.tsx` | P | T3 | No `@/proto/mock/` import |
| web | `proto/features/documentation/components/changelog-doc.tsx` → `features/documentation/components/changelog-doc.tsx` | P | T3 | No `@/proto/mock/` import |
| web | `proto/features/documentation/components/versioning-doc.tsx` → `features/documentation/components/versioning-doc.tsx` | P | T3 | No `@/proto/mock/` import |
| web | `app/proto/app/documentation/page.dev.tsx` → `app/(dashboard-layout)/app/documentation/page.tsx` | P | T3 | |
| web | `web/lib/api/schema.d.ts` | M | T3 | `npm run api:types` |
| web | `web/lib/routes.ts` | M | T3 | `documentation` |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts` | M | T3 | Footer link |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.test.ts` | M | T3 | Footer is Settings, Documentation |
| web | `web/proto/features/documentation/api.ts` | M | T3 | `pm4-twin: differs` marker (D10) |
| web | `web/proto/features/documentation/proposed-types.ts` | M | T3 | `ChangelogEntryDto.type: string` (D4) |

## Interfaces

### Generator script (T1)
```js
// scripts/changelog.mjs — no dependencies, Node 24, ESM. Exports for tests; CLI when run directly.
import { APP_PATHS, nextRelease } from "./release-version.mjs";

/** @typedef {{ type: string, scope: string | null, description: string, breaking: boolean, hash: string }} ChangelogEntry */
/** @typedef {{ app: "web" | "api", version: string, tag: string, date: string, commitCount: number, changes: ChangelogEntry[] }} ChangelogRelease */
/** @typedef {{ hash: string, message: string }} Commit  // message = subject + body */

/**
 * One commit → its change, or null when the changelog hides it. Subject (first line)
 * `^(\w+)(?:\(([^)]*)\))?(!)?: (.+)$`, no match → null. breaking = `!`, or a body line (after the first)
 * starting `BREAKING CHANGE:` / `BREAKING-CHANGE:`. Kept when type is `feat` or `fix`, or breaking.
 * scope = the parenthesis trimmed, "" or absent → null; description = the rest of the subject, trimmed.
 */
export function changeFor(commit /* Commit */) /* : ChangelogEntry | null */;

/**
 * releases oldest first, each `{ version, tag, date, commits }` with commits newest first (git log order)
 * → `{ items }` newest first; commitCount = commits.length, changes = the kept changes in commit order.
 */
export function buildChangelog(app /* "web" | "api" */, releases) /* : { items: ChangelogRelease[] } */;
```
CLI `node scripts/changelog.mjs <web|api> <out-file>` (out-file relative to the current directory), from any
directory inside the repo:
- Repo root: `git rev-parse --show-toplevel`; every git command runs there.
- Tags: `git tag --merged HEAD --list "<app>-v[0-9]*"`, sorted by semver (numeric), oldest first. A tag that isn't
  `<app>-v\d+.\d+.\d+` → error.
- Commits of a range: `git log --no-merges --format=%h%x1f%B%x1e <range> -- <APP_PATHS[app]>`, split on `\x1e`,
  trimmed, empty ones dropped, each split at the first `\x1f` into `hash` and `message` (trimmed). Ranges:
  `<previous tag>..<tag>`; the first tag: `<tag>` (all its history).
- Date of a release: `git log -1 --format=%cs <tag>`.
- The release being shipped: commits of `<last tag>..HEAD` (no tags: `HEAD`) →
  `nextRelease({ app, lastTag, messages })`; when its `tag` isn't null, add `{ version, tag, date: %cs of HEAD,
  commits }` as the newest release. (After the deploy tags HEAD, a re-run finds no commits, so no duplicate.)
- Writes `JSON.stringify(buildChangelog(app, releases), null, 2) + "\n"` (creating the folder), prints one line:
  `web changelog: 9 releases (latest web-v0.6.0) → public/changelog.json`, or `… 0 releases → …`.
- A missing or unknown app, no out-file, or a malformed tag → message on stderr, exit 1.

### Workflows and ignore (T1)
- `web-deploy.yml`, right after `Stamp version`:
  ```yaml
      - name: Changelog
        run: node ../scripts/changelog.mjs web public/changelog.json
  ```
- `api-deploy.yml`, right after `Stamp version`: the same step with `node ../scripts/changelog.mjs api changelog.json`;
  `Stage deployment package` copies it: `cp package.json package-lock.json changelog.json deploy/`.
- Root `.gitignore`, after the `scripts/dashboard.mjs` block:
  ```
  # Generated by scripts/changelog.mjs in the deploy workflows (feat-shell-documentation)
  /web/public/changelog.json
  /api/changelog.json
  ```

### API (T2)
```ts
// api/src/changelog/dto/changelog-response.dto.ts (test step, in full)
import { ApiProperty } from "@nestjs/swagger";
export const CHANGELOG_APPS = ["web", "api"] as const;
export type ChangelogApp = (typeof CHANGELOG_APPS)[number];

/** `ChangelogEntry` (API-SYS-004): a `feat` or `fix` commit, or a breaking commit of any type. */
export class ChangelogEntryDto {
  /** The conventional-commit type, e.g. `feat`. */
  type: string;
  /** The conventional-commit scope, e.g. `web`; null when absent. */
  @ApiProperty({ type: String, nullable: true })
  scope: string | null;
  /** The commit subject after `type(scope)!: `. */
  description: string;
  /** `type!:` or a `BREAKING CHANGE:` footer. */
  breaking: boolean;
  /** Short commit hash. */
  hash: string;
}

/** `ChangelogRelease`: one release of one app. */
export class ChangelogReleaseDto {
  @ApiProperty({ enum: CHANGELOG_APPS, enumName: "ChangelogApp" })
  app: ChangelogApp;
  /** Semver without the `v`, e.g. `0.6.0`. */
  version: string;
  /** The release's git tag, e.g. `api-v0.6.0`. */
  tag: string;
  /** `YYYY-MM-DD`, the tagged commit's date. */
  date: string;
  /** Every non-merge commit of the release for this app, hidden ones included. */
  @ApiProperty({ type: Number })
  commitCount: number;
  changes: ChangelogEntryDto[];
}

/** API-SYS-004: the API's releases, newest first. */
export class ChangelogResponseDto {
  items: ChangelogReleaseDto[];
}
```
```ts
// api/src/changelog/read-changelog.ts
/** Where api-deploy stages the generated file: next to package.json, the process's working directory. */
export const CHANGELOG_PATH = resolve(process.cwd(), "changelog.json");
/** No file → `{ items: [] }`; otherwise the parsed file. Invalid JSON throws (the API then doesn't start). */
export function readChangelog(path: string = CHANGELOG_PATH): ChangelogResponseDto;
```
Controller (generated, then like `VersionController`): `@Public() @NoRateLimit() @Controller("changelog")`, a field
`private readonly changelog = readChangelog();` (read once when the app starts), and
`@Get() @ApiProblemResponsesNotLimited() get(): ChangelogResponseDto` returning it. Then `npm run openapi:export`.

### Web (T3)
Twins first, from `web/` (the stub of `changelog.ts` is replaced by its prototype twin):
```bash
sed 's#@/proto/#@/#g' proto/features/documentation/changelog.ts > features/documentation/changelog.ts
npm run api:types
```
The promoted components need no changes. `features/documentation/api.ts` (replacing the stub) keeps the mock's
exports, keys and query options, with production types and data:
```ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type ChangelogApp = components["schemas"]["ChangelogApp"];
export type ChangelogEntryDto = components["schemas"]["ChangelogEntryDto"];
export type ChangelogReleaseDto = components["schemas"]["ChangelogReleaseDto"];
type ChangelogResponseDto = components["schemas"]["ChangelogResponseDto"];

export const documentationKeys = {
  all: ["documentation"] as const,
  changelog: (app: ChangelogApp) => [...documentationKeys.all, "changelog", app] as const
};

/** The web deploy's changelog file, at the site root (deployment.md#release-changelog-oq-270). */
export const WEB_CHANGELOG_URL = "/changelog.json";

// useWebChangelog(enabled): queryFn = fetch(WEB_CHANGELOG_URL, { signal }); status 404 → [] (no file: local, D6);
//   another non-ok status → throw new Error(`GET ${WEB_CHANGELOG_URL} failed (${status})`); else (await json()).items.
// useApiChangelog(enabled): as the mock, over the real apiClient (no ChangelogPaths cast).
export function useChangelog(app: ChangelogApp): UseQueryResult<ChangelogReleaseDto[]>; // as the mock
```
Other changes:
- `lib/routes.ts`: `documentation: "/app/documentation",` after `settings`.
- `sidebaritems.ts`: import `BookOpen`; in `footerItems`, after the Settings item:
  `{ id: "documentation", name: "Documentation", icon: BookOpen, url: routes.app.documentation }`.
- `sidebaritems.test.ts`: the footer names are `["Settings", "Documentation"]`.
- `proto/features/documentation/api.ts`: add to the doc comment of `useWebChangelog`:
  `pm4-twin: differs (the prototype can't serve the deploy's changelog.json; production fetches it)`.
- `proto/features/documentation/proposed-types.ts`: `ChangelogEntryDto.type: string` with the comment
  "The conventional-commit type: `feat` or `fix`, or any type when breaking (OQ-271)."

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `changeFor`: `feat(web): a` → `{type: "feat", scope: "web", description: "a", breaking: false, hash}`; `fix: b` → scope null; `feat(): c` → scope null; `chore: d`, `docs(api): e`, `Update README` → null; `refactor(api)!: f` → type `refactor`, breaking true; `chore: g` with body line `BREAKING CHANGE: x` → breaking true; `fix!: h` → kept, breaking | `scripts/changelog.ac.test.mjs` | T1 |
| AC-2 | `buildChangelog`: input oldest first → items newest first, each with `app`; commitCount counts hidden commits; a release whose commits are all hidden has `changes: []` | `scripts/changelog.ac.test.mjs` | T1 |
| AC-3 | CLI in a temporary repo: `feat(web): init` (web/) tagged `web-v0.0.1`; `feat(web): a` tagged `web-v0.1.0`; then `fix(web): b`, `chore: c` (web/), `docs: d` (api/ only), and a merge commit `feat!: merge side` of a branch whose only commit is `fix(web): side` (the merge commit is ignored) → `web` writes 3 releases newest first: `0.1.1` (tag `web-v0.1.1`, date of HEAD, commitCount 3, changes fix b and fix side, none breaking), `0.1.0` (1 commit, [feat a]), `0.0.1` (1 commit, [feat init]); `api` → one release `0.0.1` (`api-v0.0.1`, commitCount 1, changes []); after tagging HEAD `web-v0.1.1`, `web` writes the same 3 releases; run from a subfolder → same file | `scripts/changelog.ac.test.mjs` | T1 |
| AC-4 | CLI: no tags and no commits for the app → `{"items": []}`; no argument or no out-file → exit 1; a tag `web-v1.2` → exit 1 | `scripts/changelog.ac.test.mjs` | T1 |
| AC-5 | Both workflows: `Changelog` after `Stamp version` and before the build; the API stages `changelog.json`; both generated files are git-ignored | `check` | T1 |
| AC-6 | `readChangelog`: a path that doesn't exist → `{items: []}`; a file with `{items: [release]}` → that object; invalid JSON → throws | `api/src/changelog/read-changelog.ac.spec.ts` | T2 |
| AC-7 | API-SYS-004: `GET /api/v1/changelog` without a token → `200` with an `items` array; `/changelog` without the prefix → `404` | `api/test/changelog.ac.e2e-spec.ts` | T2 |
| AC-8 | `openapi.json` has `/api/v1/changelog` with `ChangelogResponseDto`, `ChangelogReleaseDto`, `ChangelogEntryDto` and the `ChangelogApp` enum; the generated contract is current | `check` | T2 |
| AC-9 | `changelogText`: `full marketing page (T-0147)` → `full marketing page`; `sync (T-0063, push 2)` → `sync (push 2)`; `rate limiting (T-0125…T-0128, feat-api-rate-limit)` → `rate limiting`; `nonprodMinutes (T-0130, feat-rpt-api D5)` → `nonprodMinutes`; `x (OQ-196, ADR-0012)` → `x`; `keep (optional) text` unchanged. `changelogScope`: scope `web` viewing web → null; `api` viewing web → `api`; null → null; `tooling` → `tooling` | `web/features/documentation/changelog.ac.test.ts` | T3 |
| AC-10 | `useChangelog("web")`: fetches `/changelog.json`, data = its `items`, under key `["documentation", "changelog", "web"]`; `apiClient.GET` not called | `web/features/documentation/api.ac.test.tsx` | T3 |
| AC-11 | `useChangelog("web")`: a `404` → success with `[]` (D6); a `500` → error state | `web/features/documentation/api.ac.test.tsx` | T3 |
| AC-12 | `useChangelog("api")`: `apiClient.GET("/api/v1/changelog", …)` → data = `items`, under `["documentation", "changelog", "api"]`; `fetch` not called | `web/features/documentation/api.ac.test.tsx` | T3 |
| AC-13 | Sidebar: `footerItems` is Settings, then Documentation → `/app/documentation` with the BookOpen icon; both exports link every app route once (incl. `/app/documentation`); at `/app/settings` only the Settings footer link is active | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts`, `web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx` | T3 |
| AC-14 | The build has `/app/documentation` | `check` | T3 |
| AC-15 | After the next deploys: `/app/documentation?tab=changelog` lists the web releases with the new one marked Latest; **API** lists the API's from API-SYS-004; the Versioning tab matches deployment.md#release-versions-oq-098 | `manual` | T3 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `scripts/changelog.mjs`: `changeFor`, `buildChangelog` each `throw new Error("not implemented (feat-shell-documentation)")`;
  the CLI entry exits 1 with the same message.
- `api/src/changelog/read-changelog.ts`: `CHANGELOG_PATH` real, `readChangelog` throws as above.
- `web/features/documentation/changelog.ts`: `changelogText`, `changelogScope` with their prototype signatures, throwing.
- `web/features/documentation/api.ts`: the four types as local copies of `proto/features/documentation/proposed-types.ts`
  (T3 replaces them with the schema aliases), `documentationKeys` and `WEB_CHANGELOG_URL` real, `useChangelog` throws.

## Checks
```bash
# AC-1…AC-4: changelog script acceptance tests
node --test scripts/changelog.ac.test.mjs

# AC-5: deploy steps and ignored files
for w in web api; do
  f=.github/workflows/$w-deploy.yml
  grep -q "changelog.mjs $w" $f
  test "$(grep -n 'name: Stamp version' $f | cut -d: -f1)" -lt "$(grep -n 'name: Changelog' $f | cut -d: -f1)"
  test "$(grep -n 'name: Changelog' $f | cut -d: -f1)" -lt "$(grep -n 'run: npm run build' $f | cut -d: -f1)"
done
grep -q 'changelog.mjs web public/changelog.json' .github/workflows/web-deploy.yml
grep -q 'cp package.json package-lock.json changelog.json deploy/' .github/workflows/api-deploy.yml
git check-ignore -q web/public/changelog.json
git check-ignore -q api/changelog.json

# AC-8: the contract has the endpoint and is current
node -e "const d=require('./api/openapi.json'); const s=d.components.schemas; if(!d.paths['/api/v1/changelog']?.get||!s.ChangelogResponseDto||!s.ChangelogReleaseDto||!s.ChangelogEntryDto||!s.ChangelogApp) process.exit(1)"
tmp=$(mktemp -d)
cp api/openapi.json web/lib/api/schema.d.ts "$tmp/"
(cd api && npm run -s openapi:export) && cmp -s api/openapi.json "$tmp/openapi.json"
(cd web && npm run -s api:types) && cmp -s web/lib/api/schema.d.ts "$tmp/schema.d.ts"

# AC-14: the page is built
test -f web/out/app/documentation.html
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Changelog generator script, its deploy steps, ignored files | infra | M | sonnet | git ranges and CLI tests against a temp repo plus workflow YAML; infra, so the main session runs it | — |
| T2 | API-SYS-004: DTOs, reader, public controller, contract | api | S | haiku | Copies `version/`; reader and DTOs spelled out | — |
| T3 | Documentation page: promote, real hooks, route, sidebar link | web | S | haiku | A promoted prototype screen plus a hook pair spelled out | T2 |

## Open questions
—

## Changelog
- 2026-11-07: Initial draft from prototype `d1c097f` (OQ-270…272). Open questions empty → `review`.
- 2026-11-07: Approved by the owner.
- 2026-11-07: Test step: the prototype `changelog.ts` imports its types from `./api` instead of `./proposed-types` (not promoted), so the sed twin compiles.
