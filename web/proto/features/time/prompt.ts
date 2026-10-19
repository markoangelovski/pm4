import { format, parseISO } from "date-fns";
import type { TimeLog } from "./types";

export interface PromptSection {
  key: string;
  project: { id: string | null; title: string } | null;
  task: { id: string | null; title: string } | null;
  date: string;
  notes: string[];
}

const refKey = (ref: { id: string | null; title: string } | null) =>
  ref ? (ref.id ?? `deleted:${ref.title}`) : "none";

/** One section per project + task, in first-appearance order. Excluded (non-productive) logs aren't booked, so
 *  they're left out. A note is the log's text on one line. */
export function promptSections(
  workDate: string,
  logs: TimeLog[]
): PromptSection[] {
  const date = format(parseISO(workDate), "EEEE, d MMMM yyyy");
  const sections = new Map<string, PromptSection>();
  for (const log of logs) {
    if (log.excludeFromStats) continue;
    const key = `${refKey(log.project)}|${refKey(log.task)}`;
    let section = sections.get(key);
    if (!section) {
      section = {
        key,
        project: log.project
          ? { id: log.project.id, title: log.project.title }
          : null,
        task: log.task ? { id: log.task.id, title: log.task.title } : null,
        date,
        notes: []
      };
      sections.set(key, section);
    }
    const note = log.text.replace(/\s+/g, " ").trim();
    if (note) section.notes.push(note);
  }
  return [...sections.values()];
}

/** A ref's title, then its external link when it has one (Slack links a bare URL). */
const withLink = (
  ref: { title: string } | null,
  link: string | null | undefined
) => (ref ? (link ? `${ref.title} (${link})` : ref.title) : "—");

export interface PromptLinks {
  project?: string | null;
  task?: string | null;
}

/** Slack markdown, ready to paste: "Book my time accordingly:" once, then each section with the project's and task's
 *  external links, separated by a blank line. */
export function promptMarkdown(
  entries: { section: PromptSection; links: PromptLinks }[]
): string {
  const body = entries.map(({ section, links }) =>
    [
      `**Project:** ${withLink(section.project, links.project)}`,
      `**Task:** ${withLink(section.task, links.task)}`,
      `**Date:** ${section.date}`,
      "**Note:**",
      ...section.notes.map((n) => `- ${n}`)
    ].join("\n")
  );
  return ["Book my time accordingly:", ...body].join("\n\n");
}
