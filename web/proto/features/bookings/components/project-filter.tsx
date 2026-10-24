"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ProjectIcon } from "@/proto/features/projects/components/project-icon";
import { DeletedName } from "@/proto/features/time/components/deleted-marker";
import type { ProjectOption } from "../days";

const ALL = "all";

/** The Project filter (SCR-045): All projects, then the range's projects by title (a deleted one with the deleted marker). */
export function ProjectFilter({
  options,
  value,
  disabled,
  onChange
}: {
  options: ProjectOption[];
  /** A projectKey, or null for All projects. */
  value: string | null;
  disabled?: boolean;
  onChange: (key: string | null) => void;
}) {
  const items = [
    { value: ALL, label: "All projects" },
    ...options.map((o) => ({ value: o.key, label: o.project.title }))
  ];
  return (
    <Select
      items={items}
      value={value ?? ALL}
      disabled={disabled}
      onValueChange={(v) => onChange(v && v !== ALL ? v : null)}
    >
      <SelectTrigger
        aria-label="Project"
        className="w-56 cursor-pointer rounded-md!"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL} className="cursor-pointer">
          All projects
        </SelectItem>
        {options.map(({ key, project }) => (
          <SelectItem key={key} value={key} className="cursor-pointer">
            {project.id && !project.deleted ? (
              <span className="flex min-w-0 items-center gap-2">
                <ProjectIcon
                  project={{ id: project.id }}
                  className="size-4 rounded-sm"
                />
                <span className="truncate">{project.title}</span>
              </span>
            ) : (
              <DeletedName title={project.title} />
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
