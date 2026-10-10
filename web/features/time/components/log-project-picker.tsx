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
import { ProjectIcon } from "@/features/projects/components/project-icon";
import { useProjects } from "@/features/projects/api";
import type { ProjectRef } from "../types";

export function LogProjectPicker({
  id,
  value,
  onChange,
  disabled
}: {
  id?: string;
  value: ProjectRef | null;
  onChange: (p: ProjectRef | null) => void;
  disabled?: boolean;
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
  return (
    <Combobox<ProjectRef>
      items={projects}
      value={value}
      onValueChange={(next) => onChange(next ?? null)}
      itemToStringLabel={(p) => p.title}
      isItemEqualToValue={(a, b) => a.id === b.id}
      autoHighlight
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder="No project"
        showClear={!!value && !disabled}
        disabled={disabled}
        className="w-full rounded-md! [&_button]:cursor-pointer"
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
            <ComboboxItem key={item.id} value={item} className="cursor-pointer">
              <ProjectIcon project={item} className="size-4 rounded-sm" />
              <span className="truncate">{item.title}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
