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
import {
  projectKeys,
  useProject,
  type Project
} from "@/proto/features/projects/api";
import { taskKeys, useTask, type Task } from "@/proto/features/tasks/api";
import {
  promptMarkdown,
  promptSections,
  type PromptLinks,
  type PromptSection
} from "../prompt";
import type { Day } from "../types";

/** Copies `text`; true for 2 s after a copy, for the button's Copied state. Toasts when the clipboard refuses. */
function useCopy(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };
  return [copied, copy];
}

/** SCR-040's Prompt dialog: one section per project + task of the day, each copyable as Slack markdown, or all at once. */
export function DayPromptDialog({
  day,
  open,
  onOpenChange
}: {
  day: Day;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sections = promptSections(day.workDate, day.logs);
  const date = format(parseISO(day.workDate), "EEEE, d MMMM yyyy");
  const queryClient = useQueryClient();
  const [copiedAll, copy] = useCopy();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-md! sm:max-w-2xl! max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prompt for {date}</DialogTitle>
        </DialogHeader>
        {sections.length === 0 ? (
          <p className="text-muted-foreground">This day has no logs to book.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sections.map((s) => (
              <PromptCard key={s.key} section={s} />
            ))}
          </div>
        )}
        <DialogFooter className="rounded-b-md">
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
      </DialogContent>
    </Dialog>
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

function PromptCard({ section }: { section: PromptSection }) {
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
          <ul className="list-disc space-y-0.5 pl-4 break-words">
            {section.notes.map((n, i) => (
              <li key={i}>{n}</li>
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
