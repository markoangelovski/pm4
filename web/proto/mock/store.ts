// In-memory data of the UI prototype (module state: resets on every reload). The mock client
// (`./client.ts`) and the store hooks (`./hooks.ts`) read and change it.
import { useSyncExternalStore } from "react";
import type { components } from "@/lib/api/schema";
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
  /** logId → the date the log is booked to (Bookings). */
  bookings: Record<string, string>;
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

const listeners = new Set<() => void>();
function set(next: Partial<MockState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => (
  listeners.add(l),
  () => void listeners.delete(l)
);

export const getMockState = (): MockState => state;

export function useMockState(): MockState {
  return useSyncExternalStore(subscribe, getMockState, getMockState);
}

/** A new id with the given prefix (`p-new1`, `l10001`, …). */
export function nextId(prefix: string): string {
  set({ seq: state.seq + 1 });
  return `${prefix}${state.seq}`;
}

const without = (m: Record<string, string>, key: string) =>
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
  addLog(input: Omit<TimeLog, "id">, dayStart?: number): TimeLog {
    const log = { ...input, id: nextId("l") };
    set({
      starts: startsWith(input.workDate, dayStart),
      logs: [...state.logs, log]
    });
    return log;
  },
  updateLog(id: string, input: Omit<TimeLog, "id">, dayStart?: number) {
    set({
      starts: startsWith(input.workDate, dayStart),
      logs: state.logs.map((l) => (l.id === id ? { ...input, id } : l))
    });
  },
  deleteLog(id: string) {
    const bookings = without(state.bookings, id);
    set({ logs: state.logs.filter((l) => l.id !== id), bookings });
  },
  setStart(date: string, minute: number) {
    set({ starts: { ...state.starts, [date]: minute } });
  },
  book(logId: string, date: string) {
    set({ bookings: { ...state.bookings, [logId]: date } });
  },
  bookMany(logIds: string[], date: string) {
    set({
      bookings: {
        ...state.bookings,
        ...Object.fromEntries(logIds.map((id) => [id, date]))
      }
    });
  },
  unbook(logId: string) {
    set({ bookings: without(state.bookings, logId) });
  }
};
