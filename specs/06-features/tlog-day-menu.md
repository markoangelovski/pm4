---
id: feat-tlog-day-menu
title: "Day menu: Go to Bookings, and Push to PMSPA in the menu"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-31
milestone: M4
requirements: [FR-INT-012, SCR-040]
related: [web-screens, req-integrations, feat-tlog-prompt, feat-int-web, feat-book-web-nav, OQ-252]
prototype: bb4a1e2
---

# Day menu: Go to Bookings, and Push to PMSPA in the menu

## Goal
On the Logs page (SCR-040), the day's ⋯ menu gets **Go to Bookings** (Bookings opened at that day, scrolled into view
and outlined) and takes over **Push to PMSPA** from its own button (FR-INT-012). Menu order: **Go to Bookings**,
**Prompt**, **Push to PMSPA**, **Delete day**.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The ⋯ menu lists **Go to Bookings** (CalendarCheck icon), **Prompt**, **Push to PMSPA** (Upload icon), **Delete day**, in that order. The menu is as wide as its longest item (`w-max`), so no item wraps. The standalone **Push to PMSPA** button before the menu is gone. | Owner, 2026-10-31; prototype `bb4a1e2` |
| D2 | **Go to Bookings** is a link to `/app/bookings?from=<1st of the day's month>&to=<end>#day-<date>`: `<end>` is `monthUpTo(date, today).to` (the month's end, or today if earlier), or the date itself when the day is after today. Bookings' existing hash handling scrolls the day's section into view and outlines it until the next click (FR-BOOK-008). Disabled while the day has no logs (Bookings doesn't list a day without logs); disabled, the item isn't a link, so middle-click or *Open in new tab* can't reach it either. | Owner, 2026-10-31 (OQ-252); prototype `bb4a1e2` |
| D3 | **Push to PMSPA** as a menu item keeps FR-INT-012's rules: hidden without a saved connection; disabled on a day without logs or while the status isn't Connected. The reason ("PMSPA: <status>. Check it in Settings → Integrations.") is the item's `title` (the browser's hover hint); the disabled item keeps pointer events (`data-disabled:pointer-events-auto`, shadcn turns them off on disabled items) so the hint shows, and Base UI still blocks the click. A day without logs has no hint, like **Prompt**. It opens the same push preview dialog. | Owner, 2026-10-31 (OQ-252); prototype `bb4a1e2` |
| D4 | The push logic moves out of `PushToPmspaButton` into a hook `usePmspaAction`, which the button (project and task detail, unchanged) and the day view both use. The day view calls it and renders its dialog, so the dialog outlives the closed menu, and passes it to `DayMenu` as `push`; `DayMenu` itself reads nothing from the API, so the Prompt tests' exact API-call counts still hold. | Main session, 2026-10-31 |
| D5 | The production files are twins of the prototype's: copy, `@/proto/` → `@/`, then Prettier, so `pm4 twins` reports them equal. `@/lib/routes` (`routes.app.bookings`) and `@/features/bookings/days` (`dayAnchor`, `monthUpTo`) already exist in production. | as feat-tlog-prompt D6 |

## Scope
**In:** `DayMenu`, `DayView` and `push-button.tsx` in `web/features/`, as twins of the prototype files.

**Test step (main session, before T1):** writes `web/features/time/components/day-menu.ac.test.tsx` and adds the new
required `today` prop (`today="2026-10-31"`… any date after the test day) to every `<DayMenu …>` render in
`day-prompt-dialog.ac.test.tsx`, `day-prompt-notes.ac.test.tsx` and `day-prompt-duration.ac.test.tsx` (nothing else in
them changes), then `pm4 hash`. No stubs: the exports exist (`usePmspaAction` and `PmspaAction` are typed in the test
through `DayMenu`'s props only).

**Non-goals** (implementers must not touch these):
- `api/` (no contract change), `web/proto/**`, `web/app/proto/**`, `web/components/ui/*`.
- `web/features/bookings/**` (the scroll and outline already exist), `web/features/integrations/api.ts`,
  `sync-preview-dialog.tsx`, the project and task detail pages (they keep `PushToPmspaButton` as it is).
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/time/components/day-menu.tsx` | The menu: copied with `@/proto/` → `@/` (T1) |
| `web/proto/features/time/components/day-view.tsx` | Calls `usePmspaAction`, renders `push.dialog`, passes `today` and `push` to `DayMenu` (T1) |
| `web/proto/features/integrations/components/push-button.tsx` | `usePmspaAction`, `PmspaAction`, and `PushToPmspaButton` over the hook (T1) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/time/components/day-menu.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/time/components/day-prompt-dialog.ac.test.tsx` | M | tests | `today` prop on `DayMenu` only |
| web | `web/features/time/components/day-prompt-notes.ac.test.tsx` | M | tests | `today` prop on `DayMenu` only |
| web | `web/features/time/components/day-prompt-duration.ac.test.tsx` | M | tests | `today` prop on `DayMenu` only |
| web | `web/proto/features/time/components/day-menu.tsx` → `web/features/time/components/day-menu.tsx` | P | T1 | `@/proto/` → `@/`, then Prettier |
| web | `web/proto/features/time/components/day-view.tsx` → `web/features/time/components/day-view.tsx` | P | T1 | `@/proto/` → `@/`, then Prettier |
| web | `web/proto/features/integrations/components/push-button.tsx` → `web/features/integrations/components/push-button.tsx` | P | T1 | `@/proto/` → `@/`, then Prettier |

## Interfaces

### Web (T1)
The three files become their prototype twins (D5), from the repo root:
```bash
for f in time/components/day-menu.tsx time/components/day-view.tsx integrations/components/push-button.tsx; do
  sed 's#@/proto/#@/#g' web/proto/features/$f > web/features/$f
done
cd web && npx prettier --write features/time/components/day-menu.tsx features/time/components/day-view.tsx features/integrations/components/push-button.tsx
```
No other change. The exported API the tests use:
```ts
// web/features/integrations/components/push-button.tsx
export function usePmspaAction(props: {
  target: PmspaSyncTargetDto | PmspaPushTargetDto;
  label: string;
  disabled?: boolean;
  disabledHint?: string;
}): {
  hidden: boolean;            // no saved connection
  mode: "sync" | "push";
  label: string;              // "Sync with PMSPA" | "Push to PMSPA"
  disabled: boolean;          // not Connected, or props.disabled
  hint: string | undefined;   // the status hint, else props.disabledHint when disabled
  start: () => void;          // loads the preview and opens the dialog
  dialog: ReactNode;          // the preview dialog (null when hidden)
};
export type PmspaAction = ReturnType<typeof usePmspaAction>;
export function PushToPmspaButton(props: Parameters<typeof usePmspaAction>[0]): JSX.Element | null;

// web/features/time/components/day-menu.tsx
export function DayMenu(props: { day: Day; today: string; push?: PmspaAction }): JSX.Element;
```

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `DayMenu` with logs and a connected `push` → the menu items are exactly Go to Bookings, Prompt, Push to PMSPA, Delete day, in that order | `web/features/time/components/day-menu.ac.test.tsx` | T1 |
| AC-2 | Day `2026-09-15` (with logs), today `2026-10-31` → **Go to Bookings** links to `/app/bookings?from=2026-09-01&to=2026-09-30#day-2026-09-15`; day `2026-10-07`, today `2026-10-20` → `?from=2026-10-01&to=2026-10-20#day-2026-10-07`; day `2026-11-03`, today `2026-10-31` → `?from=2026-11-01&to=2026-11-03#day-2026-11-03` | `web/features/time/components/day-menu.ac.test.tsx` | T1 |
| AC-3 | A day without logs → **Go to Bookings** disabled (as **Prompt**) and not a link | `web/features/time/components/day-menu.ac.test.tsx` | T1 |
| AC-4 | No `push`, or `push.hidden` → no **Push to PMSPA** item; `push.disabled` with a hint → the item is disabled, its `title` is the hint, it keeps pointer events (`data-disabled:pointer-events-auto`) and clicking it doesn't call `push.start`; enabled → clicking it calls `push.start` once | `web/features/time/components/day-menu.ac.test.tsx` | T1 |
| AC-5 | `DayView` on a day with logs and `GET /api/v1/integrations/pmspa` Connected → no **Push to PMSPA** button outside the menu; the menu's item → `POST /api/v1/integrations/pmspa/push/preview` with `{ type: "day", id: <date> }` and the dialog "Push the logs of <d MMM yyyy> to PMSPA" stays open after the menu closes | `web/features/time/components/day-menu.ac.test.tsx` | T1 |
| AC-6 | The Prompt tests (feat-tlog-prompt AC-6…AC-21) pass with `today` passed to `DayMenu` | the three updated test files | T1 |
| AC-7 | The three files equal their prototype twins | check | T1 |

## Checks
```bash
# AC-7: twins equal
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Go to Bookings and Push to PMSPA in the day menu: the three prototype twins | web | S | haiku | Twin copy, the commands under *Interfaces → Web* | — |

## Open questions
None.

## Changelog
- 2026-10-31: Initial draft from prototype `bb4a1e2` (OQ-252).
- 2026-10-31: To `review`.
- 2026-10-31: The owner approved it.
- 2026-10-31: *Files*: the `P` rows in the `proto → production` form `pm4 promote` reads (no change in scope).
- 2026-10-31: Review of T-0124 (owner's choices): D2 a disabled **Go to Bookings** isn't a link; D3 the disabled **Push to PMSPA** keeps pointer events so its hover hint shows (AC-3, AC-4). Prototype changed first.
