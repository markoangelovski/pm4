"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { projectKeys, useProject, type Project } from "@/features/projects/api";
import { taskKeys, useTask, type Task } from "@/features/tasks/api";
import {
  promptMarkdown,
  promptSections,
  type PromptLinks,
  type PromptSection
} from "../prompt";
import type { Day } from "../types";

/** Copies `text`; true for 2 s after the latest copy, for the button's Copied state. Toasts when the clipboard refuses. */
function useCopy(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  // Counts copies, so a copy while Copied is showing restarts the 2 s.
  const [copies, setCopies] = useState(0);
  useEffect(() => {
    if (!copies) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copies]);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopies((n) => n + 1);
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };
  return [copied, copy];
}

/** SCR-040's Prompt dialog: one section per project + task of the day, each copyable as Slack markdown, or all at once.
 *  Each note is editable for the copy only; the logs don't change. */
export function DayPromptDialog({
  day,
  open,
  onOpenChange
}: {
  day: Day;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex! max-h-[90vh] flex-col gap-0! rounded-md! p-0! sm:max-w-2xl!">
        <PromptContent day={day} />
      </DialogContent>
    </Dialog>
  );
}

/** The dialog's content. It unmounts with the closed dialog, so edited notes reset on the next open. */
function PromptContent({ day }: { day: Day }) {
  const date = format(parseISO(day.workDate), "EEEE, d MMMM yyyy");
  const queryClient = useQueryClient();
  const [copiedAll, copy] = useCopy();
  // Edited notes by section key; a section not edited yet keeps its logs' notes.
  const [edits, setEdits] = useState<Record<string, string[]>>({});
  const sections = promptSections(day.workDate, day.logs).map((s) => ({
    ...s,
    notes: edits[s.key] ?? s.notes
  }));
  const handleNoteChange = (section: PromptSection, i: number, text: string) =>
    setEdits((prev) => ({
      ...prev,
      [section.key]: section.notes.map((n, j) => (j === i ? text : n))
    }));
  // Each card fetches its project and task, so their links are in the cache by the time Copy all is clicked.
  const handleCopyAll = () =>
    copy(
      promptMarkdown(
        sections.map((section) => ({
          section,
          links: {
            project: section.project?.id
              ? queryClient.getQueryData<Project>(
                  projectKeys.detail(section.project.id)
                )?.externalLink
              : null,
            task: section.task?.id
              ? queryClient.getQueryData<Task>(taskKeys.detail(section.task.id))
                  ?.externalLink
              : null
          }
        }))
      )
    );
  return (
    <>
      <DialogHeader className="border-b p-6 pb-4">
        <DialogTitle>Prompt for {date}</DialogTitle>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {sections.length === 0 ? (
          <p className="px-6 py-4 text-muted-foreground">
            This day has no logs to book.
          </p>
        ) : (
          <div className="flex flex-col gap-3 px-6 py-4">
            {sections.map((s) => (
              <PromptCard
                key={s.key}
                section={s}
                onNoteChange={(i, text) => handleNoteChange(s, i, text)}
              />
            ))}
          </div>
        )}
      </div>
      <DialogFooter className="mx-0 mb-0 rounded-b-md border-t p-4">
        <DialogClose
          render={<Button variant="outline" className="cursor-pointer" />}
        >
          Cancel
        </DialogClose>
        <Button
          disabled={sections.length === 0}
          className="cursor-pointer"
          onClick={handleCopyAll}
          aria-live="polite"
        >
          {copiedAll ? <Check /> : <Copy />}
          {copiedAll ? "Copied" : "Copy all"}
        </Button>
      </DialogFooter>
    </>
  );
}

/** A ref's title, then its external link (opens in a new tab) when it has one. */
function RefLink({
  item,
  link
}: {
  item: PromptSection["project"];
  link: string | null | undefined;
}) {
  if (!item) return <>—</>;
  return (
    <>
      {item.title}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 inline-flex items-center gap-1 break-all text-muted-foreground underline underline-offset-3 hover:text-foreground"
        >
          {link}
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      )}
    </>
  );
}

function PromptCard({
  section,
  onNoteChange
}: {
  section: PromptSection;
  onNoteChange: (i: number, text: string) => void;
}) {
  const projectId = section.project?.id ?? null;
  const taskId = section.task?.id ?? null;
  const project = useProject(projectId ?? "", projectId !== null);
  const task = useTask(taskId ?? "", taskId !== null);
  const links: PromptLinks = {
    project: project.data?.externalLink,
    task: task.data?.externalLink
  };
  const [copied, copy] = useCopy();
  const handleCopy = () => copy(promptMarkdown([{ section, links }]));
  return (
    <section className="flex flex-col gap-2 rounded-md border p-3">
      <p>Book my time accordingly:</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
        <dt className="font-medium">Project:</dt>
        <dd className="min-w-0 break-words">
          <RefLink item={section.project} link={links.project} />
        </dd>
        <dt className="font-medium">Task:</dt>
        <dd className="min-w-0 break-words">
          <RefLink item={section.task} link={links.task} />
        </dd>
        <dt className="font-medium">Date:</dt>
        <dd>{section.date}</dd>
        <dt className="font-medium">Note:</dt>
        <dd className="min-w-0">
          <ul className="list-disc space-y-0.5 pl-4">
            {section.notes.map((n, i) => (
              <li key={i}>
                <Textarea
                  aria-label={`Note ${i + 1}`}
                  value={n}
                  onChange={(e) => onNoteChange(i, e.target.value)}
                  className="min-h-0 resize-none rounded-md border-transparent px-1.5 py-0.5 align-top hover:border-input md:text-base"
                />
              </li>
            ))}
          </ul>
        </dd>
      </dl>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer self-end"
        onClick={handleCopy}
        aria-live="polite"
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy to clipboard"}
      </Button>
    </section>
  );
}
