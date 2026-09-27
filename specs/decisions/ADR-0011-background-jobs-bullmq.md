# ADR-0011: Background jobs with BullMQ, run inside the API process

- **Status:** accepted
- **Date:** 2026-09-27
- **Deciders:** Marko Angelovski
- **Related:** req-trash, arch-overview, arch-deployment, ADR-0002, ADR-0008, OQ-031, NFR-013

## Context
- Trash items must be purged some time after 31 days (FR-TRASH-005). The owner doesn't need the exact
  day, so late purges are fine.
- The API runs on the App Service **Free (F1)** tier. It has no Always On, so the app is unloaded when
  idle, and in-process timers (`@nestjs/schedule`) don't fire while it sleeps.
- The owner wants a general async job mechanism that can also serve later features (for example, sending emails).
- Redis Cloud is already a dependency (ADR-0008).

## Decision
- Background work uses **BullMQ** queues in the existing Redis Cloud database, through `@nestjs/bullmq`.
- The **worker runs inside the API process**. There is no separate worker app, WebJob or GitHub Actions job.
  Jobs queued while the app is asleep wait in Redis and run once the app is loaded again.
- The first job is **`trash.purge`** (per user). It's queued when the user **opens the app**, meaning a
  sign-in (`/auth/token`) or a session refresh (`/auth/refresh`). It's deduplicated to **at most
  once per user per day** (BullMQ `jobId` = `trash-purge:<userId>:<UTC date>`). See req-trash for the rules.
- **Job rules** (the API and the worker share one Node event loop):
  - Jobs must be **I/O-bound** (DB queries, HTTP calls) and must not hold the CPU for long. Awaited I/O
    doesn't block request handling. Long synchronous CPU work does.
  - Worker **concurrency 1** (one job at a time per process), so jobs use at most one DB connection from the shared pool.
  - Large DB work runs in **batches** (e.g. 500 rows per statement/transaction), not one huge transaction.
  - A job type that is CPU-heavy (e.g. PDF/CSV generation, image processing) must say so in its spec, and
    runs in a **BullMQ sandboxed processor** (a separate child process or worker thread), or in a separate
    worker process (WebJob) if its spec says so. On F1 the CPU quota is shared either way.
- Jobs are **idempotent**, because a job interrupted by an unload is retried after the next start
  (BullMQ stalled-job recovery).
- Finished jobs aren't kept: `removeOnComplete: true`, and failed jobs are kept briefly for debugging
  (`removeOnFail: { age: 7 days, count: 100 }`). Retries use exponential backoff, 3 attempts.
- Redis must use the **`noeviction`** eviction policy, which BullMQ requires. All non-queue keys still have
  TTLs (NFR-013).

## Alternatives considered
- A scheduled GitHub Actions workflow calling a protected `/internal/trash/purge` endpoint: works on
  any tier, but adds a workflow, a shared secret and a non-public endpoint, and gives no general job mechanism.
- `@nestjs/schedule` in-app cron: misses runs while F1 is asleep.
- A **continuous WebJob** running the worker as a separate process: WebJobs are available on F1 (Linux
  WebJobs are GA), but without Always On a WebJob only runs while the app is loaded, which is the same
  lifecycle as an in-process worker. It would add a second entry point and packaging step, and share the
  same F1 memory and CPU quota, for no gain. If jobs ever get heavy, the same NestJS code can be started as
  a WebJob (`dist/worker.js`) without changing the queue design.
- A synchronous purge inside the sign-in request: slows down sign-in, and isn't reusable for other async work.

## Consequences
- Trash purges are best-effort and **per user**. A user who never opens the app keeps their trash rows
  until they return. That's acceptable, because the rows are small and bounded by what they deleted.
- Items past retention stay visible and restorable until the job actually purges them (req-trash).
- The worker needs a dedicated Redis connection (`maxRetriesPerRequest: null`). The API uses about 3–4
  connections in total, well under the Redis Cloud free tier's limit.
- If Redis is unavailable, jobs can't be queued. Sign-in fails anyway in that case (ADR-0007), so this adds no new failure mode.
- Future job types (emails etc.) need a spec change. Email is out of MVP scope.
