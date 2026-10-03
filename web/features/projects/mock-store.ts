"use client";

/**
 * UI PROTOTYPE ONLY: an in-memory stand-in for the projects API (feat-prj-api), so the screens can be
 * designed before the endpoints exist. State lives in this module: it survives client-side navigation
 * and resets on a full page reload. Replaced by `features/projects/api.ts` when the API is connected.
 */
import { useSyncExternalStore } from "react";
import type { TaskStatus } from "@/features/tasks/status";

export interface LeadUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface UserSummary extends LeadUser {
  email: string;
}

export type LeadValue =
  { kind: "user"; user: LeadUser } | { kind: "text"; name: string } | null;

export type TaskCounts = Record<TaskStatus, number> & { total: number };

export interface Project {
  id: string;
  title: string;
  description: string | null;
  externalLink: string | null;
  lead: LeadValue;
  taskCounts: TaskCounts;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectInput {
  title: string;
  description: string | null;
  externalLink: string | null;
  lead: LeadValue;
}

export const PROJECT_SORTS = [
  "updatedAt:desc",
  "createdAt:desc",
  "title:asc"
] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

/** Other registered PM4 users, for the lead search (API-USR-003). */
export const MOCK_USERS: UserSummary[] = [
  {
    id: "u-ana",
    displayName: "Ana Horvat",
    email: "ana.horvat@example.com",
    avatarUrl: null
  },
  {
    id: "u-ivan",
    displayName: "Ivan Kovačević",
    email: "ivan.k@example.com",
    avatarUrl: null
  },
  {
    id: "u-maja",
    displayName: "Maja Babić",
    email: "maja@studio-babic.hr",
    avatarUrl: null
  },
  {
    id: "u-luka",
    displayName: "Luka Novak",
    email: "luka.novak@example.com",
    avatarUrl: null
  },
  {
    id: "u-sara",
    displayName: "Sara Jurić",
    email: "sara.juric@example.com",
    avatarUrl: null
  },
  {
    id: "u-diana",
    displayName: "Dijana Marić",
    email: "dijana.m@example.com",
    avatarUrl: null
  }
];

function counts(upcoming: number, inProgress: number, completed: number) {
  return {
    upcoming,
    "in-progress": inProgress,
    completed,
    total: upcoming + inProgress + completed
  };
}

const SEED_TITLES = [
  "Website redesign",
  "Mobile app v2",
  "Client onboarding portal",
  "Internal wiki",
  "Q4 marketing campaign",
  "Payment gateway migration",
  "Design system",
  "Customer support chatbot",
  "Data warehouse",
  "Annual report 2026",
  "Office move",
  "Hiring: backend engineers",
  "API documentation",
  "Security audit",
  "Newsletter automation",
  "Web analytics dashboard",
  "Partner integrations",
  "Accessibility review",
  "Infrastructure cost cuts",
  "Product launch: PM4",
  "Legacy CRM shutdown",
  "Brand guidelines",
  "Team offsite",
  "SEO improvements",
  "Translations (DE, IT)",
  "Customer interviews",
  "Billing system rewrite",
  "Webshop for Babić studio"
];

function seed(): Project[] {
  const now = Date.now();
  const day = 86_400_000;
  return SEED_TITLES.map((title, i) => {
    const lead: LeadValue =
      i % 5 === 0
        ? null
        : i % 4 === 0
          ? { kind: "text", name: "Petra (client)" }
          : { kind: "user", user: MOCK_USERS[i % MOCK_USERS.length] };
    const c =
      i % 7 === 3 ? counts(0, 0, 0) : counts((i * 3) % 7, i % 3, (i * 5) % 9);
    return {
      id: `p${i + 1}`,
      title,
      description:
        i % 3 === 0
          ? null
          : `${title}: goals, scope and the next steps.\nKeep the client updated weekly.`,
      externalLink:
        i % 2 === 0 ? `https://example.com/projects/${i + 1}` : null,
      lead,
      taskCounts: c,
      createdAt: new Date(now - (60 - i) * day).toISOString(),
      updatedAt: new Date(
        now - ((i * 7) % 30) * day - i * 3_600_000
      ).toISOString(),
      deletedAt: null
    };
  });
}

let projects: Project[] = seed();
let nextId = projects.length + 1;
const listeners = new Set<() => void>();

function emit(next: Project[]) {
  projects = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAllProjects(): Project[] {
  return useSyncExternalStore(
    subscribe,
    () => projects,
    () => projects
  );
}

export function useProjectById(id: string): Project | undefined {
  const all = useAllProjects();
  return all.find((p) => p.id === id);
}

export function createProject(input: ProjectInput): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: `p${nextId++}`,
    ...input,
    taskCounts: counts(0, 0, 0),
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
  emit([project, ...projects]);
  return project;
}

export function updateProject(id: string, input: ProjectInput) {
  emit(
    projects.map((p) =>
      p.id === id ? { ...p, ...input, updatedAt: new Date().toISOString() } : p
    )
  );
}

export function deleteProject(id: string) {
  emit(
    projects.map((p) =>
      p.id === id ? { ...p, deletedAt: new Date().toISOString() } : p
    )
  );
}

export function restoreProject(id: string) {
  emit(projects.map((p) => (p.id === id ? { ...p, deletedAt: null } : p)));
}

/** Prototype helper: changes a task count so the statistics can be tried out. */
export function adjustTaskCount(id: string, status: TaskStatus, delta: number) {
  emit(
    projects.map((p) => {
      if (p.id !== id) return p;
      const value = Math.max(0, p.taskCounts[status] + delta);
      const next = { ...p.taskCounts, [status]: value };
      return {
        ...p,
        taskCounts: {
          ...next,
          total: next.upcoming + next["in-progress"] + next.completed
        }
      };
    })
  );
}

/** API-USR-003 stand-in: name or email contains q (case-insensitive). */
export function searchUsers(q: string, me: UserSummary | undefined) {
  const needle = q.trim().toLowerCase();
  const all = me ? [me, ...MOCK_USERS] : MOCK_USERS;
  return all.filter(
    (u) =>
      u.displayName.toLowerCase().includes(needle) ||
      u.email.toLowerCase().includes(needle)
  );
}

/** 0 when total is 0; else rounded to a whole number (OQ-085). */
export function completionPercent(c: TaskCounts): number {
  return c.total === 0 ? 0 : Math.round((c.completed / c.total) * 100);
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const LEAD_NAME_MAX = 100;
