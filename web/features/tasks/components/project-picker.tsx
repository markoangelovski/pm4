"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { useProjects } from "@/features/projects/api";
import type { ProjectRef } from "@/features/tasks/api";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import { cn } from "@/lib/utils";

const ALL: ProjectRef = { id: "", title: "All projects" };

/**
 * D7: a searchable project combobox. In filter mode (`allowAll`) the first option is
 * "All projects", which maps to `null`.
 */
export function ProjectPicker({
  id,
  value,
  onChange,
  allowAll,
  invalid,
  className
}: {
  id?: string;
  value: ProjectRef | null;
  onChange: (project: ProjectRef | null) => void;
  allowAll?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const query = useProjects({
    q: "",
    sort: "title:asc",
    page: 1,
    pageSize: 100
  });
  const projects: ProjectRef[] = (query.data?.items ?? []).map((p) => ({
    id: p.id,
    title: p.title
  }));
  const items = allowAll ? [ALL, ...projects] : projects;
  const selected = value ?? (allowAll ? ALL : null);

  return (
    <Combobox<ProjectRef>
      items={items}
      value={selected}
      onValueChange={(next) => onChange(next && next.id !== "" ? next : null)}
      itemToStringLabel={(item) => item.title}
      isItemEqualToValue={(a, b) => a.id === b.id}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder="Choose a project"
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-md! [&_button]:cursor-pointer",
          className
        )}
      >
        {value ? (
          <InputGroupAddon align="inline-start">
            <ProjectIcon project={value} className="size-4 rounded-sm" />
          </InputGroupAddon>
        ) : null}
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>No projects found</ComboboxEmpty>
        <ComboboxList>
          {(item: ProjectRef) => (
            <ComboboxItem
              key={item.id || "all"}
              value={item}
              className="cursor-pointer"
            >
              {item.id ? (
                <ProjectIcon project={item} className="size-4 rounded-sm" />
              ) : null}
              <span className="truncate">{item.title}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
