import Link from "next/link";
import { FolderKanban, ListTodo } from "lucide-react";
import { DeletedName } from "@/proto/features/time/components/deleted-marker";
import { routes } from "@/proto/lib/routes";
import { cn } from "@/lib/utils";
import type { NoteRefDto } from "../types";

function RefLink({ ref_, href }: { ref_: NoteRefDto; href: string }) {
  if (!ref_.id || ref_.deleted) return <DeletedName title={ref_.title} />;
  return (
    <Link
      href={`${href}?id=${ref_.id}`}
      className="truncate hover:underline underline-offset-2"
    >
      {ref_.title}
    </Link>
  );
}

/** A note's or to-do's project and task, as links (a deleted one is plain text with the deleted marker), like a log row's. */
export function LinkLine({
  project,
  task,
  className
}: {
  project: NoteRefDto | null;
  task: NoteRefDto | null;
  className?: string;
}) {
  if (!project && !task) return null;
  return (
    <span
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      {project ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <FolderKanban className="size-3.5 shrink-0" />
          <RefLink ref_={project} href={routes.app.project} />
        </span>
      ) : null}
      {project && task ? <span aria-hidden>·</span> : null}
      {task ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <ListTodo className="size-3.5 shrink-0" />
          <RefLink ref_={task} href={routes.app.task} />
        </span>
      ) : null}
    </span>
  );
}
