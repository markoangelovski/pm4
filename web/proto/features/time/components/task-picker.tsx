"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from "@/components/ui/combobox";
import { useState } from "react";
import { InputGroupAddon } from "@/components/ui/input-group";
import { useTasks } from "@/proto/features/tasks/api";
import { TASK_STATUSES } from "@/proto/features/tasks/status";
import type { TaskRef } from "../types";
import { DeletedMarker } from "./deleted-marker";

const label = (t: TaskRef) =>
  t.id ? `${t.project.title} · ${t.title}` : t.title;

export function TaskPicker({
  id,
  value,
  deletedTitle,
  onChange,
  projectId
}: {
  id?: string;
  value: TaskRef | null;
  /** A deleted task's name, shown with the deleted marker while `value` is null (OQ-150). */
  deletedTitle?: string | null;
  onChange: (t: TaskRef | null) => void;
  projectId: string | null;
}) {
  const [q, setQ] = useState("");
  const query = useTasks({
    ...(projectId ? { projectId } : {}),
    statuses: [...TASK_STATUSES],
    q: "", // never sent: the API matches titles only, so the picker filters in the browser
    sort: "title:asc",
    page: 1,
    pageSize: 100
  });
  const items: TaskRef[] = (query.data?.items ?? [])
    .filter((t) => !projectId || t.project.id === projectId)
    .map((t) => ({
      id: t.id,
      title: t.title,
      project: { id: t.project.id, title: t.project.title }
    }));
  const needle = q.toLowerCase();
  const shown = needle
    ? items.filter((t) => label(t).toLowerCase().includes(needle))
    : items;
  // The deleted task is the box's value, never an option (its empty id marks it): picking one or clearing replaces it.
  const deleted: TaskRef | null =
    !value && deletedTitle
      ? { id: "", title: deletedTitle, project: { id: "", title: "" } }
      : null;
  return (
    <Combobox<TaskRef>
      items={shown}
      filter={null}
      value={value ?? deleted}
      onValueChange={(next) => onChange(next ?? null)}
      itemToStringLabel={label}
      isItemEqualToValue={(a, b) => a.id === b.id}
      onInputValueChange={(v, details) => {
        if (details.reason === "input-change") setQ(v.trim());
        else if (details.reason === "item-press") setQ("");
      }}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder="No task"
        showClear={!!(value ?? deleted)}
        className="w-full rounded-md! [&_button]:cursor-pointer"
      >
        {deleted ? (
          <InputGroupAddon align="inline-start">
            <DeletedMarker className="size-4" />
          </InputGroupAddon>
        ) : null}
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>No tasks found</ComboboxEmpty>
        <ComboboxList>
          {(item: TaskRef) => (
            <ComboboxItem key={item.id} value={item} className="cursor-pointer">
              <span className="truncate">
                <span className="text-muted-foreground">
                  {item.project.title} ·{" "}
                </span>
                {item.title}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
