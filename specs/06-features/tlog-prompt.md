---
id: feat-tlog-prompt
title: "Booking prompt: the day's logs as a Slack prompt"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-22
milestone: M4
requirements: [FR-TLOG-020, SCR-040]
related: [req-time-logs, web-screens, feat-tlog-web, feat-hard-delete, OQ-210, OQ-211]
prototype: d091e93
---

# Booking prompt: the day's logs as a Slack prompt

## Goal
On the Logs page (SCR-040), the day's ⋯ menu gets **Prompt**: a dialog with the day's logs as "Book my time accordingly:"
sections, one per project + task, each copyable as markdown, or all at once, to paste into Slack (FR-TLOG-020).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | **Prompt** (Sparkles icon) sits above **Delete day**, disabled while the day has no logs. | Owner, prototype `d091e93` |
| D2 | One section per project + task, in first-appearance order; excluded logs (FR-TLOG-018) are left out. A deleted project or task groups by its retained name; none → "—". Each log is one note bullet, its text on one line. Date `EEEE, d MMMM yyyy`. | Owner, prototype `d091e93` |
| D3 | A project's or task's external link shows as a new-tab link; in the copied markdown it follows the name as `Title (url)`. Each section reads its project and task (API-PRJ-003, API-TSK-003); **Copy all** takes the links from the query cache, so a link not loaded yet is left out. | Owner, prototype `d091e93` |
| D4 | Copied format: standard markdown (`**Label:**`, `- ` bullets), "Book my time accordingly:" once at the top, a blank line between sections. A copy button shows a check and "Copied" for 2 s; a failed copy → toast "Couldn't copy to the clipboard." | Owner, prototype `d091e93` |
| D5 | "Exports" is no longer out of scope in req-time-logs. | OQ-210 (owner, 2026-10-19) |
| D6 | The production files are twins of the prototype's: copy, `@/proto/` → `@/`, then Prettier, so `pm4 twins` reports them equal. No new hook: production's `useProject`, `useTask`, `projectKeys` and `taskKeys` already match the mock ones. | as feat-hard-delete D5 |
| D7 | The dialog's header (title) and footer (**Cancel**, **Copy all**) stay fixed and only the body (the sections, or the empty message) scrolls, the way the PMSPA **Import** preview dialog does (`sync-preview-dialog.tsx`, e.g. Time tab with all days selected). Same layout: `DialogContent` `flex! max-h-[90vh] flex-col gap-0! rounded-md! p-0! sm:max-w-2xl!` (no `overflow-y-auto`); `DialogHeader` `border-b p-6 pb-4`; body `min-h-0 flex-1 overflow-y-auto` with the content padded `px-6` (plus vertical padding so the first and last card don't touch the borders); `DialogFooter` `mx-0 mb-0 rounded-b-md border-t p-4`. Built and confirmed in the prototype (`prototype` step), then copied over as the twin (D6). | Owner, 2026-10-19; prototype `8fe9c80` |
| D8 | Each note is editable in the dialog: an inline, auto-growing shadcn `Textarea` per bullet (`aria-label` "Note <n>", borderless until hover or focus). **Copy to clipboard** and **Copy all** copy the edited notes; `promptMarkdown` puts each note on one line and leaves out empty ones. Edits are for the copy only: no API call, the logs don't change, and they're discarded when the dialog closes (the content unmounts), so reopening shows the logs' texts. Project, task and date stay read-only. | Owner, 2026-10-22 (OQ-211); prototype `3c9f4af` |

## Scope
**In:** the **Prompt** menu item, the Prompt dialog and its pure prompt builder in `web/features/time/`, as twins of the
prototype files. T2 (D7): the dialog's fixed header and footer with a scrolling body. T3 (D8): editable notes.

**Test step (main session, before T1):** writes the two acceptance test files and the typed stubs below, then `pm4 hash`.
**Test step (main session, before T3):** writes `web/features/time/components/day-prompt-notes.ac.test.tsx` (no stubs: the
exports exist), then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `api/` (no contract change), `web/proto/**` (except the dialog file listed for T1), `web/app/proto/**`, `web/components/ui/*`.
- `web/features/projects/api.ts`, `web/features/tasks/api.ts` (used as they are).
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/time/prompt.ts` | The prompt builder: copied as is (T1) |
| `web/proto/features/time/components/day-prompt-dialog.tsx` | The dialog: copied with `@/proto/` → `@/` (T1) |
| `web/proto/features/time/components/day-menu.tsx` | The menu with **Prompt**: copied over production's (T1) |
| `web/features/integrations/components/sync-preview-dialog.tsx` → `SyncPreviewDialog`, `PreviewBody` | The fixed header / scrolling body / fixed footer layout the prototype step copies (D7) |
| `web/features/projects/api.ts` → `useProject`, `projectKeys`; `web/features/tasks/api.ts` → `useTask`, `taskKeys` | The production hooks the dialog calls; same names and shapes as the mock (T1) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/time/prompt.ac.test.ts` | C | tests | Acceptance tests (the builder) |
| web | `web/features/time/components/day-prompt-dialog.ac.test.tsx` | C | tests | Acceptance tests (menu and dialog) |
| web | `web/features/time/prompt.ts` | C | tests, T1 | Stub (tests), then the twin of `web/proto/features/time/prompt.ts` |
| web | `web/features/time/components/day-prompt-dialog.tsx` | C | tests, T1 | Stub (tests), then the twin of `web/proto/features/time/components/day-prompt-dialog.tsx` |
| web | `web/features/time/components/day-menu.tsx` | M | T1 | Twin of `web/proto/features/time/components/day-menu.tsx` |
| web | `web/proto/features/time/components/day-prompt-dialog.tsx` | M | T1 | Review fix: copying again restarts the 2 s Copied state (D4); fixed here first, then copied over again. The D7 layout is changed here in the prototype step, not by T2 |
| web | `web/features/time/components/day-prompt-dialog.tsx` | M | T2 | The twin of the prototype file again, with D7 (same `sed` + Prettier as T1) |
| web | `web/features/time/components/day-prompt-notes.ac.test.tsx` | C | tests | Acceptance tests (D8) |
| web | `web/features/time/prompt.ts` | M | T3 | The twin of the prototype file again, with D8 (same `sed` + Prettier as T1) |
| web | `web/features/time/components/day-prompt-dialog.tsx` | M | T3 | The twin of the prototype file again, with D8 (same `sed` + Prettier as T1) |

## Interfaces

### Web (T1)
Each of the three files becomes its prototype twin (D6), from the repo root:
```bash
for f in prompt.ts components/day-prompt-dialog.tsx components/day-menu.tsx; do
  sed 's#@/proto/#@/#g' web/proto/features/time/$f > web/features/time/$f
done
cd web && npx prettier --write features/time/prompt.ts features/time/components/day-prompt-dialog.tsx features/time/components/day-menu.tsx
```
No other change: the dialog's imports (`@/features/projects/api`, `@/features/tasks/api`, `sonner`, `@/components/ui/*`)
all exist in production. The exported API, which the tests and stubs use:
```ts
// web/features/time/prompt.ts
export interface PromptSection {
  key: string;
  project: { id: string | null; title: string } | null;
  task: { id: string | null; title: string } | null;
  date: string;
  notes: string[];
}
export interface PromptLinks { project?: string | null; task?: string | null; }
export function promptSections(workDate: string, logs: TimeLog[]): PromptSection[];
export function promptMarkdown(entries: { section: PromptSection; links: PromptLinks }[]): string;

// web/features/time/components/day-prompt-dialog.tsx
export function DayPromptDialog(props: { day: Day; open: boolean; onOpenChange: (open: boolean) => void }): JSX.Element;
```

### Web (T3)
The T1 commands for `prompt.ts` and `components/day-prompt-dialog.tsx` only (not `day-menu.tsx`, unchanged). The diff they
bring is `git diff 8fe9c80 3c9f4af -- web/proto/features/time/`. The exported API stays as under *Web (T1)*; the dialog
now also imports `@/components/ui/textarea` (exists in production).

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `promptSections` on logs A·X, B·(no task), A·X, an excluded A·X → two sections, A·X (two notes) then B·null | `web/features/time/prompt.ac.test.ts` | T1 |
| AC-2 | A log text with line breaks and repeated spaces → one note, single-spaced and trimmed | `web/features/time/prompt.ac.test.ts` | T1 |
| AC-3 | A deleted project (`id: null`) → its own section keyed by its title, with `project.id` null | `web/features/time/prompt.ac.test.ts` | T1 |
| AC-4 | Only excluded logs → `[]` | `web/features/time/prompt.ac.test.ts` | T1 |
| AC-5 | `promptMarkdown` of two sections (`2026-10-06`; the first with a project and task link, the second with no task) → exactly `Book my time accordingly:\n\n**Project:** A (https://p)\n**Task:** X (https://t)\n**Date:** Tuesday, 6 October 2026\n**Note:**\n- one\n- two\n\n**Project:** B\n**Task:** —\n**Date:** Tuesday, 6 October 2026\n**Note:**\n- three` | `web/features/time/prompt.ac.test.ts` | T1 |
| AC-6 | `DayMenu` with a day without logs → **Prompt** disabled; with logs → clicking it opens "Prompt for <date in full>" | `web/features/time/components/day-prompt-dialog.ac.test.tsx` | T1 |
| AC-7 | Opening the dialog reads `GET /api/v1/projects/{id}` and `GET /api/v1/tasks/{id}` once per section ref with an id (none for a deleted or missing one); an `externalLink` renders as a link with `target="_blank"` and `rel="noopener noreferrer"` | `web/features/time/components/day-prompt-dialog.ac.test.tsx` | T1 |
| AC-8 | A section's **Copy to clipboard** → `navigator.clipboard.writeText` with that section's markdown, links included; the button reads "Copied", and "Copy to clipboard" again after 2 s | `web/features/time/components/day-prompt-dialog.ac.test.tsx` | T1 |
| AC-9 | **Copy all** after the reads → every section, links from the cache; before a read resolves → that link left out | `web/features/time/components/day-prompt-dialog.ac.test.tsx` | T1 |
| AC-10 | `writeText` rejects → `toast.error("Couldn't copy to the clipboard.")`, the button keeps its label | `web/features/time/components/day-prompt-dialog.ac.test.tsx` | T1 |
| AC-11 | A day whose logs are all excluded → "This day has no logs to book." and **Copy all** disabled | `web/features/time/components/day-prompt-dialog.ac.test.tsx` | T1 |
| AC-12 | The three files equal their prototype twins | check | T1 |
| AC-13 | A day with enough sections to overflow `90vh` → the title and the footer buttons stay in view and only the body scrolls; AC-6…AC-12 still pass | manual (dev server, Logs page) + check | T2 |
| AC-14 | `promptMarkdown` of one section whose notes are `"a\n  b "`, `"  "` and `"c"` → its note lines are exactly `- a b` and `- c` | `web/features/time/components/day-prompt-notes.ac.test.tsx` | T3 |
| AC-15 | The dialog shows each note as a textbox "Note <n>" holding the log's text; project, task and date are not textboxes | `web/features/time/components/day-prompt-notes.ac.test.tsx` | T3 |
| AC-16 | Editing a note, then the section's **Copy to clipboard** → that section's markdown with the edited note; **Copy all** → every section, the edited note in place, the others unchanged; clearing a note → its bullet left out of the copy | `web/features/time/components/day-prompt-notes.ac.test.tsx` | T3 |
| AC-17 | Edit a note, close the dialog, open it again → the note shows the log's original text; no `POST`/`PATCH`/`PUT`/`DELETE` call was made | `web/features/time/components/day-prompt-notes.ac.test.tsx` | T3 |
| AC-18 | `prompt.ts` and `day-prompt-dialog.tsx` equal their prototype twins | check | T3 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/features/time/prompt.ts`: the two interfaces as above; `promptSections` and `promptMarkdown` with each body
  `throw new Error("not implemented (feat-tlog-prompt)")`.
- `web/features/time/components/day-prompt-dialog.tsx`: `DayPromptDialog` with the props above, its body the same `throw`.

## Checks
```bash
# AC-12: twins equal
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | The Prompt item and dialog: the three prototype twins | web | S | haiku | Twin copy, the commands under *Interfaces → Web* | — |
| T2 | Fixed header and footer, scrolling body (D7): the confirmed prototype dialog's twin | web | S | haiku | Twin copy, the T1 commands for `day-prompt-dialog.tsx` only | T1 |
| T3 | Editable notes (D8): the confirmed prototype's `prompt.ts` and dialog twins | web | S | haiku | Twin copy, the T1 commands for two files | T2 |

## Open questions
None.

## Changelog
- 2026-10-19: Initial draft from prototype `d091e93` (OQ-210).
- 2026-10-19: To `review`.
- 2026-10-19: Approved by the owner.
- 2026-10-19: D7 (owner): the dialog's header and footer stay fixed and the body scrolls, as in the PMSPA Import dialog. T2, AC-13. Back to `review`; the prototype step comes first.
- 2026-10-20: D7 confirmed in prototype `8fe9c80`. Approved by the owner.
- 2026-10-22: D8 (owner, OQ-211): editable notes, copied as edited, for the copy only. Prototype `3c9f4af`, T3, AC-14…AC-18. Back to `review`.
- 2026-10-22: Approved by the owner.
