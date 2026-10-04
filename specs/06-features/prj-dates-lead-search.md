---
id: feat-prj-dates-lead-search
title: "Projects: created/updated dates and search by project lead"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-04
milestone: M2
requirements: [FR-PRJ-002, FR-PRJ-003]
related: [api-endpoints, api-data-model, web-screens, feat-prj-api, feat-prj-web, OQ-099, OQ-100, OQ-101, OQ-102]
---

# Projects: created/updated dates and search by project lead

## Goal
The project list shows each project's created and updated dates, and its search also finds projects
by the lead's name, with title matches listed first. The project detail shows when the project was
created and last modified. FR-PRJ-002, FR-PRJ-003, API-PRJ-002, SCR-020, SCR-021.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | `q` matches the title or the lead's name. Title matches come first, then lead-only matches. Each group keeps the selected sort. | OQ-099 (owner, 2026-10-04) |
| D2 | List: **Created** and **Updated** columns, date only, `d MMM yyyy`, in the user's time zone. | OQ-100 (owner, 2026-10-04) |
| D3 | Detail: **Created** and **Last modified** as a small dimmed line below the title (moved from *Details*, owner 2026-10-04), `d MMMM yyyy, HH:mm`, in the user's time zone. | OQ-101 (owner, 2026-10-04) |
| D4 | The lead search matches the read-model name only, never an email. | OQ-102 (owner, 2026-10-04) |
| D5 | The API already returns `createdAt`/`updatedAt`, so the dates are web-only. The time zone is `useMe().data.timeZone`, as on the profile page. | Agent |
| D6 | Projects get their own `q` doc comment, so `openapi.json` and `schema.d.ts` describe the new match. The validation stays the same. | Agent: keeps the contract accurate |

## Scope
**In:** API-PRJ-002's `q` (repository, query DTO doc, `openapi.json`), the regenerated web types, two
date formatters in `web/lib/time`, the list's date columns and search placeholder, and the detail's
date rows.

**Non-goals** (implementers must not touch these):
- `GET /tasks` and its `q` (`PageQueryDto` stays unchanged), the sort options, and the response shapes.
- Indexes or schema changes (the search runs on one user's projects).
- Any other column, card or state on SCR-020/SCR-021.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#api-prj-002-list-projects` | The new `q` rule |
| `specs/03-api/data-model.md#project-lead-projects-and-tasks` | Which name is the lead's name |
| `api/src/projects/projects.repository.ts` | `list()`, `selectRows()`, the `lead` alias, `ORDER_BY`, `escapeLike` |
| `api/src/projects/dto/list-projects-query.dto.ts`, `api/src/common/dto/page-query.dto.ts` | Where `q` is declared today |
| `specs/04-web/screens.md` (SCR-020, SCR-021) | Columns, rows, placeholder, formats |
| `web/lib/time/index.ts` | `formatDate()`: the `TZDate` + `format` pattern to copy |
| `web/features/users/components/user-profile.tsx` | `useMe()` + `formatDate(…, me.timeZone)` |
| `web/features/projects/components/projects-list.tsx`, `project-detail.tsx` | The table, skeleton rows and `DetailRow` |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/projects-lead-search.ac.e2e-spec.ts` | C | tests | Acceptance tests |
| api | `api/src/projects/projects.repository.ts` | M | T1 | `list()` |
| api | `api/src/projects/projects.repository.spec.ts` | M | T1 | Only if an existing unit test needs the new query |
| api | `api/src/projects/dto/list-projects-query.dto.ts` | M | T1 | Own `q` with the new doc comment |
| api | `api/openapi.json` | M | T1 | `npm run openapi:export` |
| web | `web/lib/time/format-date-time.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/projects/components/project-dates.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/lib/time/index.ts` | M | tests, T2 | Stubs from the test writer, then T2 |
| web | `web/lib/api/schema.d.ts` | M | T2 | `npm run api:types` |
| web | `web/features/projects/components/projects-list.tsx` | M | T2 | Columns, skeleton cells, placeholder |
| web | `web/features/projects/components/project-detail.tsx` | M | T2 | Two `DetailRow`s |

## Interfaces

### API (T1)
`ListProjectsQueryDto` declares its own `q` with the same decorators as `PageQueryDto`
(`@IsOptional() @Trim() @IsString() @MaxLength(200)`) and this doc comment:
`/** Case-insensitive "contains" on the title or the project lead's name (title matches first); empty = no filter. */`

`ProjectsRepository.list()` keeps its signature. With a non-empty `q` (pattern `%${escapeLike(q)}%`):
```ts
const leadName = sql`coalesce(${lead.displayName}, ${projects.projectLead})`; // read-model name
const titleMatch = ilike(projects.title, pattern);
// where: userId, not deleted, and or(titleMatch, ilike(leadName, pattern))
// orderBy: sql`(${titleMatch}) desc`, then ...ORDER_BY[sort]
```
- `lead` is the existing alias, left-joined on `projects.projectLeadUserId = lead.id`. The count query
  needs the same join.
- `coalesce` gives the user's current `displayName` for a user lead, and the saved text for a text lead
  or a deleted lead user. `email` is never matched.
- A project that matches both ways appears once, in the title group. With no `q`, the order and query
  stay as they are now.

### Web (T2)
```ts
// web/lib/time/index.ts (next to formatDate)
/** formatShortDate("2026-10-02T22:30:00.000Z", "Europe/Zagreb") → "3 Oct 2026". */
export function formatShortDate(iso: string, tz: string): string; // "d MMM yyyy"
/** formatDateTime("2026-10-02T22:30:00.000Z", "Europe/Zagreb") → "3 October 2026, 00:30". */
export function formatDateTime(iso: string, tz: string): string; // "d MMMM yyyy, HH:mm"
```
- `ProjectsList`: `const { data: me } = useMe();`. Add the columns **Created** and **Updated** after
  **Completed**, with `whitespace-nowrap` cells showing `formatShortDate(project.createdAt|updatedAt, me.timeZone)`.
  Show `—` (muted) until `me` has loaded. Move the `pr-4` padding to the last column. Skeleton rows
  get two more cells. Search placeholder: `Search by title or lead…`.
- `ProjectDetail`: after **Project lead**, add `<DetailRow label="Created">` and
  `<DetailRow label="Last modified">` with `formatDateTime(…, me.timeZone)`, `—` until `me` has loaded.
- `npm run api:types` regenerates `schema.d.ts`. Only the `q` description changes.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `q` matching a text lead (any case) → that project is listed | `api/test/projects-lead-search.ac.e2e-spec.ts` | T1 |
| AC-2 | User lead renamed from "Ana Novak" to "Bea Kos" → `q=bea` finds the project, `q=novak` doesn't. Once the lead user is deleted, the lead is the text saved with the project ("Ana Novak"): `q=novak` finds it, `q=bea` doesn't | `api/test/projects-lead-search.ac.e2e-spec.ts` | T1 |
| AC-3 | `q` matching only the lead user's email → not listed | `api/test/projects-lead-search.ac.e2e-spec.ts` | T1 |
| AC-4 | `q=web`, `sort=title:asc`: titles "Zeta web" and "Alpha web", plus "Beta" (lead "Webb") → order "Alpha web", "Zeta web", "Beta"; `total` 3; `pageSize=2&page=2` → ["Beta"] | `api/test/projects-lead-search.ac.e2e-spec.ts` | T1 |
| AC-5 | A project whose title and lead both match is listed once | `api/test/projects-lead-search.ac.e2e-spec.ts` | T1 |
| AC-6 | A lead "50% Ltd" matches `q=50%` but not `q=5_%`; other users' projects whose lead matches are never listed | `api/test/projects-lead-search.ac.e2e-spec.ts` | T1 |
| AC-7 | `formatShortDate("2026-10-02T22:30:00.000Z", "Europe/Zagreb")` → "3 Oct 2026"; `formatDateTime` of the same → "3 October 2026, 00:30"; `formatDateTime("2026-01-15T12:05:00.000Z", "Europe/Zagreb")` → "15 January 2026, 13:05" | `web/lib/time/format-date-time.ac.test.ts` | T2 |
| AC-8 | List: **Created** and **Updated** headers; a project created `2026-10-02T22:30Z` and updated `2026-10-04T12:05Z` (me in Europe/Zagreb) shows "3 Oct 2026" and "4 Oct 2026" in its row | `web/features/projects/components/project-dates.ac.test.tsx` | T2 |
| AC-9 | List: the search box has the placeholder "Search by title or lead…" | `web/features/projects/components/project-dates.ac.test.tsx` | T2 |
| AC-10 | Detail: shows (below the title, D3) "Created" "3 October 2026, 00:30" and "Last modified" "4 October 2026, 14:05" | `web/features/projects/components/project-dates.ac.test.tsx` | T2 |
| AC-11 | The contract describes the new `q` in both apps | check | T1, T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/lib/time/index.ts`: `formatShortDate` and `formatDateTime`, each body `throw new Error("not implemented (feat-prj-dates-lead-search)")`.

## Checks
```bash
# AC-11: the contract describes the new q in both apps
grep -q 'title or the project lead' api/openapi.json && grep -q 'title or the project lead' web/lib/api/schema.d.ts
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Project search also matches the lead's name, title matches first (API-PRJ-002 `q`) | api | S | sonnet | One query change, but a join in the count and a ranked order across pages | — |
| T2 | Project dates in the list and detail, the lead-search placeholder, regenerated API types | web | S | sonnet | Two formatters plus small edits to two components, following given patterns | T1 |

## Open questions
None. OQ-099…OQ-102 are answered.

## Changelog
- 2026-10-04: Initial draft from the owner's request. OQ-099…OQ-102 answered. Status `review`.
- 2026-10-04: Approved by the owner.
- 2026-10-04: AC-2 corrected while writing the tests: after the lead user is deleted, the saved name (from save time) is matched, per data-model.md *Project lead*.
