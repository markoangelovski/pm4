---
id: req-notes
title: Notes and to-dos
status: approved
owner: Marko Angelovski
last_updated: 2026-11-04
related: [req-projects, req-tasks, req-time-logs, req-integrations, api-endpoints, api-data-model, web-screens, OQ-230, OQ-231, OQ-232, OQ-233, OQ-234, OQ-235]
---

# Notes and to-dos

## Purpose
The user keeps Markdown **notes** and **to-do** lists next to their projects and tasks, or on their own ("General").

## Scope
**In:** notes and to-dos, each optionally linked to a project or a task; the Notes page (`/app/notes`) with Notes and To-dos tabs; the Notes
and To-dos cards on project and task pages; the header **New** menu.
**Out (later, OQ-235):** syncing task notes with PMSPA (PMSPA's notes are Editor.js, req-integrations *Functionality inventory*); reordering
to-dos; clearing done to-dos in bulk; pinning notes; a to-do count on the dashboard; ticking checkboxes inside a note's body.

## Model
- **Notes** and **to-dos** are separate items (OQ-230). Each belongs to one user and has an optional **link**: a project, or a task (a task link
  implies the task's project). An item with no link is **General** — the name used for it everywhere.
- A note has an optional **title** (≤ 200 characters) and a **body** of Markdown (1–10,000 characters, OQ-231): GitHub-flavoured Markdown limited
  to what converts both ways with PMSPA's Editor.js (headings, paragraphs, emphasis, links, lists, task lists, quotes, code, tables, rules);
  raw HTML is shown as text, and there are no images.
- A to-do has a **text** (1–500 characters) and is **open** or **done**; done records when it was ticked off (OQ-233).
- Both record when they were **created** and **last edited**. Ticking a to-do off or reopening it isn't an edit.
- Deleting a linked project or task keeps its notes and to-dos, which show its name with the deleted marker, as time logs do (FR-TLOG-014). Moving a
  task to another project moves its items' project with it.
- Deleting a note or a to-do is permanent (no trash).

## Requirements

### FR-NOTE-001: Notes page
**Priority:** Must
**Statement:** `/app/notes` has **Notes** and **To-dos** tabs (`?tab=`, default Notes) and a **New note** / **New to-do** button for the open tab.
The To-dos tab shows the number of open to-dos (all of them, whatever the toolbar shows). The sidebar's **Project management** section links
**Notes** after Tasks (OQ-234).
**Acceptance criteria:**
- Given 3 open and 2 done to-dos, when I open `/app/notes`, then the Notes tab is selected and the To-dos tab shows `3`.

### FR-NOTE-002: Toolbar
**Priority:** Must
**Statement:** Both tabs share one toolbar, kept in the URL (OQ-232): a search (a note's title and body, a to-do's text,
case-insensitive, applied 300 ms after typing stops); a filter **General** / **All notes** or **All to-dos** / each project by title
(a project's items include its tasks'); a sort; and a time range: the Statistics presets except So far, plus **All time** (default), filtering on the sort's
date in the user's time zone. Each tab has its own default filter and sort, and switching tabs resets both (the search and range stay)
(OQ-264). Notes: **General**; sorts **Title A–Z** (default: case-insensitive, untitled notes last, most recently edited first; its range is on
the last edit), **Last edited, newest**, **Last edited, oldest**, **Created, newest**, **Created, oldest**. To-dos: **All to-dos**; sorts
**Parent A–Z** (default; its range is on the creation) and the four date sorts. Title sorts compare character by character (OQ-265).
**Acceptance criteria:**
- Given a note created on 1 October and edited on 20 October, when the range is 1–10 October and the sort is by last edit, then it isn't listed; sorted by creation, it is.
- Given notes "beta", "Alpha" and an untitled one, when I open the Notes tab, then they're listed Alpha, beta, the untitled one (OQ-264).
- Given the Notes tab filtered to a project and sorted by creation, when I open the To-dos tab, then it shows all to-dos by parent (OQ-264).
- Given a project filter, then the list shows that project's items and its tasks' items, and a new item starts linked to that project.

### FR-NOTE-003: Notes list
**Priority:** Must
**Statement:** The Notes tab lists notes one below the other in the toolbar's order, 20 per page, each with a stripe in its project's colours
(grey for General), its title ("Untitled note" when unset), creation date, project and task links, the rendered body (a long one clamped with
**Show more**) and "Updated <date>". Empty and no-match states say what to do next.

### FR-NOTE-004: Write and edit a note
**Priority:** Must
**Statement:** **New note** opens a dialog with **Title**, the body in a **Write** / **Preview** editor, and optional **Project** and **Task**
pickers (a task sets its project). Nothing is saved until **Save** (no autosave). Clicking a note's title or body edits both in place
(Save or Ctrl/⌘+Enter, Cancel or Esc); the link changes only via **⋯ → Edit**.
**Acceptance criteria:**
- Given an empty body, when I save, then "Write something in the note." shows and nothing is saved.
- Given a note of a deleted task, when I edit only its body, then it keeps the deleted task's name.

### FR-NOTE-005: To-do lists
**Priority:** Must
**Statement:** The To-dos tab shows **Open** / **Done** / **All** and groups the to-dos by link: General first, then each project A–Z, a project's
own to-dos before each of its tasks' ("Project · Task", A–Z), deleted links last. With **Parent A–Z**, General is sorted by its name among the
projects, and in a group the to-dos are oldest first. Otherwise the toolbar's sort applies inside a group. Done or not, a to-do keeps its place
in the sort, so ticking one off doesn't move it (OQ-264).
Each group collapses and has an **Add a to-do** box (Enter adds it and keeps the box focused). A ticked-off to-do stays in view until the filter
changes (OQ-233).

### FR-NOTE-006: Tick off and edit a to-do
**Priority:** Must
**Statement:** A to-do's checkbox ticks it off or reopens it at once (done shows struck through with "Done <date>"). Clicking the text edits it
in place (Enter saves, Esc cancels); **⋯ → Edit** also changes the link; **⋯ → Delete** asks first.
**Acceptance criteria:**
- Given an open to-do, when I tick it, then it's done, and its last-edited date doesn't change.

### FR-NOTE-007: Delete a note or to-do
**Priority:** Must
**Statement:** **⋯ → Delete** on a note or a to-do asks for confirmation, then deletes it permanently.

### FR-NOTE-008: Project and task pages
**Priority:** Must
**Statement:** A project's page (SCR-021) and a task's page (SCR-031) show a **Notes** card and a **To-dos** card side by side (stacked on narrow
screens). A project's cards include its tasks' items, each naming its task. The Notes card shows 3 notes by title A–Z, then **Show more** adds 10;
the To-dos card shows the open ones, oldest first, with an add box, and **Show done** shows the done ones in their places (OQ-264). New items from these cards are linked to the page's project or task (OQ-234).

### FR-NOTE-009: New menu
**Priority:** Must
**Statement:** The header has a **New ▾** menu: Project, Task, Note, To-do and Log (OQ-241). On a project's or task's page a new task starts
in that project and a new note or to-do starts linked to it; elsewhere a note or to-do starts General. A new log is for today, with no link.

## Open questions
None. OQ-230…OQ-235 are resolved.

## Changelog
- 2026-10-24: Initial version from the owner's decisions and prototype (OQ-230…OQ-235). Ready for review.
- 2026-10-24: Approved by the owner for feat-note-todos.
- 2026-10-25: FR-NOTE-009: the New menu also creates projects, tasks and logs (OQ-241, feat-shell-new-menu). Back to `review`.
- 2026-10-25: Approved by the owner.
- 2026-11-04: FR-NOTE-002: each tab's own default filter and sort, **Title A–Z** and **Parent A–Z**; FR-NOTE-005: Parent A–Z, no open-before-done; FR-NOTE-008: the cards' order (OQ-264, OQ-265, feat-prj-lists). Back to `review`.
- 2026-11-04: Approved by the owner for feat-prj-lists.
