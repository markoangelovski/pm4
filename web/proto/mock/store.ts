// In-memory data of the UI prototype (module state: resets on every reload). The mock client
// (`./client.ts`) reads and changes it.
import type { components } from "@/lib/api/schema";
import type { BookingDto } from "@/proto/features/bookings/proposed-types";
import type { TimeLog } from "@/proto/features/time/types";
import { MOCK_USER, seedProjects, seedTasks, seedTime } from "./seed";

/**
 * Runtime marker of prototype code. Every mock hook reaches this module, so a prototype file that leaks
 * into the production bundle carries the string, and `postbuild` fails on it (specs/04-web/prototype.md).
 */
export const PROTO_MARKER = "pm4-proto-only";

type Me = components["schemas"]["MeResponseDto"];
type Project = components["schemas"]["ProjectResponseDto"];
type Task = components["schemas"]["TaskResponseDto"];

export interface MockState {
  /** Keeps PROTO_MARKER in the bundle wherever the store is. */
  marker: typeof PROTO_MARKER;
  me: Me;
  projects: Project[];
  tasks: Task[];
  logs: TimeLog[];
  /** date → start minute of the workday. */
  starts: Record<string, number>;
  /** logId → the log's bookings, by date (Bookings); absent = not booked. */
  bookings: Record<string, BookingDto[]>;
  seq: number;
}

let state: MockState = {
  marker: PROTO_MARKER,
  me: { ...MOCK_USER },
  projects: seedProjects(),
  tasks: seedTasks(),
  ...seedTime(),
  seq: 10000
};

function set(next: Partial<MockState>) {
  state = { ...state, ...next };
}

export const getMockState = (): MockState => state;

/** A new id with the given prefix (`p-new1`, `l10001`, …). */
export function nextId(prefix: string): string {
  set({ seq: state.seq + 1 });
  return `${prefix}${state.seq}`;
}

/** A log's link to a deleted task or project: the name stays, the id goes (FR-TLOG-014). */
const gone = (ref: NonNullable<TimeLog["project"]>) => ({
  id: null,
  title: ref.title,
  deleted: true
});

const without = <T>(m: Record<string, T>, key: string) =>
  Object.fromEntries(Object.entries(m).filter(([k]) => k !== key));

/** Sets the start of `input.workDate` to `dayStart` unless the day already has one. */
const startsWith = (workDate: string, dayStart: number | undefined) =>
  dayStart !== undefined && state.starts[workDate] === undefined
    ? { ...state.starts, [workDate]: dayStart }
    : state.starts;

export const mock = {
  updateMe(patch: Partial<Me>) {
    set({ me: { ...state.me, ...patch } });
  },
  setProjects(projects: Project[]) {
    set({ projects });
  },
  setTasks(tasks: Task[]) {
    set({ tasks });
  },
  /** Deletes the project and its tasks; their logs keep the names (data-model.md *Retained names*). */
  deleteProject(id: string) {
    const taskIds = new Set(
      state.tasks.filter((t) => t.project.id === id).map((t) => t.id)
    );
    set({
      projects: state.projects.filter((p) => p.id !== id),
      tasks: state.tasks.filter((t) => !taskIds.has(t.id)),
      logs: state.logs.map((l) => ({
        ...l,
        project: l.project?.id === id ? gone(l.project) : l.project,
        task: l.task?.id && taskIds.has(l.task.id) ? gone(l.task) : l.task
      }))
    });
  },
  /** Deletes the task; its logs keep its name and stay linked to its project. */
  deleteTask(id: string) {
    set({
      tasks: state.tasks.filter((t) => t.id !== id),
      logs: state.logs.map((l) =>
        l.task?.id === id ? { ...l, task: gone(l.task) } : l
      )
    });
  },
  addLog(input: Omit<TimeLog, "id">, dayStart?: number): TimeLog {
    const log = { ...input, id: nextId("l") };
    set({
      starts: startsWith(input.workDate, dayStart),
      logs: [...state.logs, log]
    });
    return log;
  },
  /** A log that stops being bookable (excluded from statistics, or no project) loses its bookings (OQ-124). */
  updateLog(id: string, input: Omit<TimeLog, "id">, dayStart?: number) {
    const bookable = !input.excludeFromStats && input.project !== null;
    set({
      starts: startsWith(input.workDate, dayStart),
      logs: state.logs.map((l) => (l.id === id ? { ...input, id } : l)),
      bookings: bookable ? state.bookings : without(state.bookings, id)
    });
  },
  deleteLog(id: string) {
    const bookings = without(state.bookings, id);
    set({ logs: state.logs.filter((l) => l.id !== id), bookings });
  },
  /** API-WD-004: the day's start and its logs go, with their bookings; other days' bookings to it stay. */
  deleteDay(date: string) {
    const gone = new Set(
      state.logs.filter((l) => l.workDate === date).map((l) => l.id)
    );
    set({
      logs: state.logs.filter((l) => !gone.has(l.id)),
      starts: without(state.starts, date),
      bookings: Object.fromEntries(
        Object.entries(state.bookings).filter(([id]) => !gone.has(id))
      )
    });
  },
  setStart(date: string, minute: number) {
    set({ starts: { ...state.starts, [date]: minute } });
  },
  /** Replaces each listed log's bookings ([] = unbooked). */
  setBookings(logs: { logId: string; bookings: BookingDto[] }[]) {
    let bookings = state.bookings;
    for (const { logId, bookings: next } of logs)
      bookings = next.length
        ? { ...bookings, [logId]: next }
        : without(bookings, logId);
    set({ bookings });
  }
};
