"use client";

import { useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RangePicker } from "@/proto/features/dashboard/components/range-picker";
import type { DateRange } from "@/proto/features/dashboard/range";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { NoteSort } from "../types";
import { NotesFilter } from "./notes-filter";

const SORT_ITEMS: { value: NoteSort; label: string }[] = [
  { value: "updatedAt:desc", label: "Last edited, newest" },
  { value: "updatedAt:asc", label: "Last edited, oldest" },
  { value: "createdAt:desc", label: "Created, newest" },
  { value: "createdAt:asc", label: "Created, oldest" }
];

/**
 * The Notes and To-dos tabs' controls: search (a note's title and body, a to-do's text; debounced), the link filter
 * (General, All, a project), the sort, and the time range (All time by default), which filters on the sort's date.
 */
export function NotesToolbar({
  noun,
  q,
  onSearch,
  projects,
  show,
  onShow,
  sort,
  onSort,
  range,
  today,
  onRange
}: {
  /** What the tab lists, for the labels. */
  noun: "notes" | "to-dos";
  q: string;
  onSearch: (q: string) => void;
  projects: { id: string; title: string }[];
  show: string;
  onShow: (show: string) => void;
  sort: NoteSort;
  onSort: (sort: NoteSort) => void;
  range: DateRange | null;
  today: string;
  onRange: (range: DateRange | null) => void;
}) {
  const [text, setText] = useState(q);
  const debounced = useDebouncedValue(text.trim(), 300);
  // Resync when q changes from outside, not while typing: our own updates make q equal the debounced text.
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    if (q !== debounced) setText(q);
  }
  useEffect(() => {
    if (debounced !== q) onSearch(debounced);
    // Only the debounced text drives the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="w-full rounded-md! sm:w-64">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder={`Search ${noun}…`}
          aria-label={`Search ${noun}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </InputGroup>
      <NotesFilter
        noun={noun}
        projects={projects}
        value={show}
        onChange={onShow}
      />
      <Select
        items={SORT_ITEMS}
        value={sort}
        onValueChange={(v) => {
          if (v) onSort(v);
        }}
      >
        <SelectTrigger
          aria-label={`Sort ${noun}`}
          className="w-48 cursor-pointer rounded-md!"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_ITEMS.map((i) => (
            <SelectItem
              key={i.value}
              value={i.value}
              className="cursor-pointer"
            >
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <RangePicker allowAll value={range} today={today} onChange={onRange} />
    </div>
  );
}
