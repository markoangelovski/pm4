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
import { useTasks } from "@/features/tasks/api";
import { TASK_STATUSES } from "@/features/tasks/status";
import type { TaskRef } from "../types";

const label = (t: TaskRef) => `${t.project.title} · ${t.title}`;

export function TaskPicker({
  id,
  value,
  onChange,
  projectId
}: {
  id?: string;
  value: TaskRef | null;
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
  return (
    <Combobox<TaskRef>
      items={shown}
      filter={null}
      value={value}
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
        showClear={!!value}
        className="w-full rounded-md! [&_button]:cursor-pointer"
      />
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
