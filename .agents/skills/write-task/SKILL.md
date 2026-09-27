---
name: write-task
description: Create PM4 implementation task files in tasks/ from approved specs, with acceptance criteria traced to requirement IDs, dependencies and sizing. Use when planning or grooming the backlog.
---

# Write a PM4 task

1. Read `tasks/README.md` and `tasks/_TEMPLATE.md`.
2. Confirm that the source specs have `status: approved`. If they don't, create the task with
   `status: blocked` and a note naming the blocking spec.
3. Take the next free ID from `tasks/BOARD.md` (`T-####`, never reused).
4. Save it as `tasks/m<N>-<milestone>/T-####-<kebab-slug>.md`.
5. Keep it to one app (`web`, `api`) or one `infra`/`spec` concern, sized M or smaller.
6. Write acceptance criteria as checkboxes. Each must be objectively verifiable and reference an
   FR/NFR/API ID where one applies.
7. List `depends_on` and link every spec section the implementer must read.
8. Add a row to `tasks/BOARD.md`.
