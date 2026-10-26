"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from "@/components/ui/combobox";
import { useServiceNames } from "@/proto/features/projects/api";
import { SERVICE_NAME_MAX } from "@/proto/features/projects/schemas";

/** A name to pick; `create` marks the "Add "<text>"" option for a name not listed yet. */
interface ServiceOption {
  name: string;
  create?: true;
}

const key = (name: string) => name.trim().toLocaleLowerCase();
const same = (a: ServiceOption, b: ServiceOption) =>
  key(a.name) === key(b.name);

/**
 * SCR-022's Services: the project's service names as chips. Typing filters the names used on other projects;
 * Enter or **Add "<text>"** adds a new one. A chip's × (or Backspace) removes it.
 */
export function ServicesField({
  id,
  value,
  onChange,
  invalid,
  "aria-describedby": ariaDescribedBy
}: {
  id?: string;
  value: string[];
  onChange: (names: string[]) => void;
  invalid?: boolean;
  "aria-describedby"?: string;
}) {
  const anchor = useComboboxAnchor();
  const suggestions = useServiceNames().data ?? [];
  const [text, setText] = useState("");
  const typed = text.trim().slice(0, SERVICE_NAME_MAX);
  const selected: ServiceOption[] = value.map((name) => ({ name }));
  const known: ServiceOption[] = [
    ...selected,
    ...suggestions
      .filter((n) => !value.some((v) => key(v) === key(n)))
      .map((name) => ({ name }))
  ];
  const items =
    typed && !known.some((o) => key(o.name) === key(typed))
      ? [...known, { name: typed, create: true as const }]
      : known;

  return (
    <Combobox<ServiceOption, true>
      multiple
      items={items}
      value={selected}
      onValueChange={(next) => {
        const names: string[] = [];
        for (const o of next)
          if (!names.some((n) => key(n) === key(o.name)))
            names.push(o.name.trim());
        onChange(names);
        setText("");
      }}
      inputValue={text}
      onInputValueChange={setText}
      itemToStringLabel={(o) => o.name}
      isItemEqualToValue={same}
      autoHighlight
    >
      <ComboboxChips ref={anchor} className="rounded-md!">
        <ComboboxValue>
          {(chosen: ServiceOption[]) =>
            chosen.map((o) => (
              <ComboboxChip key={key(o.name)} aria-label={o.name}>
                {o.name}
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput
          id={id}
          placeholder={value.length ? "" : "e.g. Backend development"}
          maxLength={SERVICE_NAME_MAX}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>Type a name to add a service</ComboboxEmpty>
        <ComboboxList>
          {(o: ServiceOption) => (
            <ComboboxItem
              key={o.create ? `create:${key(o.name)}` : key(o.name)}
              value={o}
              className="cursor-pointer"
            >
              {o.create ? (
                <>
                  <PlusIcon />
                  <span className="truncate">Add “{o.name}”</span>
                </>
              ) : (
                <span className="truncate">{o.name}</span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
