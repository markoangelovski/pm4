import type { TimeLog } from "./types";

export interface PromptSection {
  key: string;
  project: { id: string | null; title: string } | null;
  task: { id: string | null; title: string } | null;
  date: string;
  notes: string[];
}

export interface PromptLinks {
  project?: string | null;
  task?: string | null;
}

export function promptSections(
  workDate: string,
  logs: TimeLog[]
): PromptSection[] {
  void workDate;
  void logs;
  throw new Error("not implemented (feat-tlog-prompt)");
}

export function promptMarkdown(
  entries: { section: PromptSection; links: PromptLinks }[]
): string {
  void entries;
  throw new Error("not implemented (feat-tlog-prompt)");
}
