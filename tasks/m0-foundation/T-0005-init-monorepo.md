---
id: T-0005
title: Initialize the pm4 monorepo
milestone: M0
app: infra
status: done
size: S
depends_on: []
specs:
  - specs/decisions/ADR-0006-monorepo.md
  - specs/02-architecture/repositories.md
requirements: []
---

# T-0005: Initialize the pm4 monorepo

## Goal
Turn `pm4/` into the git repository that holds specs, tasks and (later) `web/` and `api/`.

## Scope
**In:** `git init` (default branch `master`), verify `.gitignore` excludes the legacy folders, the
template zip, `node_modules`, build output and env files; add a root `README.md` (short, pointing to
AGENTS.md and specs). The owner makes the first commit, creates the GitHub remote and pushes (agents never commit, AGENTS.md §3).
**Out:** app scaffolding (T-0001, T-0002), workflows (T-0003, T-0004).

## Acceptance criteria
- [x] `git status` on a fresh clone shows no legacy, template, secret or build files.
- [x] The remote (a new GitHub repo, OQ-033) exists and `master` is pushed (owner, 2026-09-27).
- [ ] Definition of Done satisfied (the applicable items).

## Blocked by
- — (`arch-repos` approved 2026-09-27). Creating the remote and pushing is the owner's action.

---

## Implementation notes

**Setup completed:**
1. Initialized git repository with `git init -b master`
2. Updated .gitignore to include *.log files (other entries already present)
3. Created root README.md with project overview and links to AGENTS.md, specs, and task board

**Verification results:**

Git initialization:
```
$ git init -b master
Initialized empty Git repository in /home/angelovski/Documents/Projects/Project_Manager/pm4/.git/
```

Git status (73 untracked files, none from legacy, template, env or build output):
```
$ git status --porcelain --untracked-files=all | wc -l
73
$ git status --porcelain --untracked-files=all | grep -E '\.(env|log)$|frontend_old|backend_old|next-shadcn|node_modules|out/|dist|\.next|coverage'
(no output - all filters returned nothing)
```

Gitignore verification (checking that problematic paths are ignored):
```
$ git check-ignore -v frontend_old/test backend_old/test next-shadcn-dashboard-main.zip api/.env web/.env web/node_modules/test api/node_modules/test web/out/test api/dist/test web/.next/test api/.tsbuildinfo web/.tsbuildinfo coverage/test
.gitignore:2:/frontend_old/	frontend_old/test
.gitignore:3:/backend_old/	backend_old/test
.gitignore:6:/next-shadcn-dashboard-main.zip	next-shadcn-dashboard-main.zip
.gitignore:18:.env	api/.env
.gitignore:18:.env	web/.env
.gitignore:10:node_modules/	web/node_modules/test
.gitignore:10:node_modules/	api/node_modules/test
.gitignore:12:web/out/	web/out/test
.gitignore:13:api/dist/	api/dist/test
.gitignore:11:web/.next/	web/.next/test
.gitignore:15:*.tsbuildinfo	api/.tsbuildinfo
.gitignore:15:*.tsbuildinfo	web/.tsbuildinfo
.gitignore:14:coverage/	coverage/test
```

No commits made:
```
$ git log 2>&1
fatal: your current branch 'master' does not have any commits yet
(expected - owner will make the first commit)
```

**Acceptance criterion status:**
- [x] Git status shows 73 untracked files from specs, tasks, config, and source code only (no legacy, template, secrets, or build output)
- [ ] Remote creation and push: owner's responsibility (OQ-033)
- [x] Definition of Done: repo initialized, .gitignore configured, README.md created

## Review
