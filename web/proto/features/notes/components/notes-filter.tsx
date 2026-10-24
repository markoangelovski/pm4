"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ProjectIcon } from "@/proto/features/projects/components/project-icon";

/** The Notes and To-dos tabs' filter value: items with no project ("General", the default), all, or a project's id. */
export const UNLINKED = "unlinked";
export const ALL = "all";

/** The Notes and To-dos tabs' filter: General (no project, the default), All notes / All to-dos, then each project by title. */
export function NotesFilter({
  noun,
  projects,
  value,
  onChange
}: {
  noun: "notes" | "to-dos";
  projects: { id: string; title: string }[];
  /** UNLINKED, ALL or a project id. */
  value: string;
  onChange: (value: string) => void;
}) {
  const items = [
    { value: UNLINKED, label: "General" },
    { value: ALL, label: `All ${noun}` },
    ...projects.map((p) => ({ value: p.id, label: p.title }))
  ];
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => onChange(v ?? UNLINKED)}
    >
      <SelectTrigger
        aria-label={`Show ${noun}`}
        className="w-56 cursor-pointer rounded-md!"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNLINKED} className="cursor-pointer">
          General
        </SelectItem>
        <SelectItem value={ALL} className="cursor-pointer">
          All {noun}
        </SelectItem>
        {projects.length > 0 ? <SelectSeparator /> : null}
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id} className="cursor-pointer">
            <span className="flex min-w-0 items-center gap-2">
              <ProjectIcon
                project={{ id: p.id }}
                className="size-4 rounded-sm"
              />
              <span className="truncate">{p.title}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
