"use client";

import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from "@/components/ui/combobox";
import { XIcon } from "lucide-react";
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useMe } from "@/features/users/api";
import { UserAvatar } from "@/features/users/components/user-avatar";
import {
  searchUsers,
  type LeadUser,
  type LeadValue,
  type UserSummary
} from "@/features/projects/mock-store";
import { useDebouncedValue } from "@/lib/use-debounced-value";

/** A lead, where a user may carry the email shown in search results. */
type LeadOption =
  | { kind: "user"; user: LeadUser & Partial<Pick<UserSummary, "email">> }
  | { kind: "text"; name: string };

function display(value: LeadValue): string {
  if (!value) return "";
  return value.kind === "user" ? value.user.displayName : value.name;
}

function sameLead(a: LeadOption, b: LeadOption): boolean {
  if (a.kind === "user" && b.kind === "user") return a.user.id === b.user.id;
  if (a.kind === "text" && b.kind === "text") return a.name === b.name;
  return false;
}

/**
 * SCR-022's lead combobox: a registered user or free text. Empty box → suggests me; 1 char → only
 * `Use "<text>"`; ≥ 2 chars → matching users (after 300 ms), then `Use "<text>"`. Leaving the box with
 * typed text keeps it as a text lead. The clear button removes the lead.
 */
export function ProjectLeadField({
  id,
  value,
  onChange,
  invalid
}: {
  id?: string;
  value: LeadValue;
  onChange: (value: LeadValue) => void;
  invalid?: boolean;
}) {
  const { data: me } = useMe();
  const [text, setText] = useState(display(value));
  const [lastValue, setLastValue] = useState(value);
  // Follow outside changes of the value (dialog reset, clear).
  if (lastValue !== value) {
    setLastValue(value);
    setText(display(value));
  }

  const trimmed = text.trim();
  const debounced = useDebouncedValue(trimmed, 300);
  const searching = trimmed.length >= 2 && debounced !== trimmed;
  const typing = trimmed !== display(value);

  const items = useMemo<LeadOption[]>(() => {
    // Not typing (box empty or showing the current lead): suggest me.
    if (!typing || trimmed.length === 0) {
      return me ? [{ kind: "user", user: me }] : [];
    }
    const useText: LeadOption = { kind: "text", name: trimmed };
    if (trimmed.length < 2 || searching) return [useText];
    return [
      ...searchUsers(debounced, me).map((user): LeadOption => ({
        kind: "user",
        user
      })),
      useText
    ];
  }, [typing, trimmed, debounced, searching, me]);

  const hasLead = value !== null || text !== "";

  function commitTyped() {
    if (!typing) return;
    onChange(trimmed ? { kind: "text", name: trimmed } : null);
  }

  return (
    <Combobox<LeadOption>
      items={items}
      filter={null}
      value={value}
      onValueChange={(next) => onChange(next)}
      inputValue={text}
      onInputValueChange={(next, details) => {
        // Keep what the user typed; ignore the primitive resetting the input on close.
        if (
          details.reason === "input-change" ||
          details.reason === "item-press" ||
          details.reason === "clear-press" ||
          details.reason === "input-clear"
        ) {
          setText(next);
        }
      }}
      onOpenChange={(open, details) => {
        if (!open && details.reason !== "item-press") commitTyped();
      }}
      itemToStringLabel={(item) =>
        item.kind === "user" ? item.user.displayName : item.name
      }
      isItemEqualToValue={sameLead}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder="Name or PM4 user"
        maxLength={101}
        aria-invalid={invalid || undefined}
        showTrigger={!hasLead}
        className="w-full rounded-md! [&_button]:cursor-pointer"
        onBlur={commitTyped}
      >
        {value?.kind === "user" && !typing ? (
          <InputGroupAddon align="inline-start">
            <UserAvatar user={value.user} className="size-5! text-[10px]" />
          </InputGroupAddon>
        ) : null}
        {hasLead ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              aria-label="Clear project lead"
              onClick={() => {
                setText("");
                onChange(null);
              }}
              className="cursor-pointer"
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </ComboboxInput>
      <ComboboxContent>
        {searching ? (
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
            <Spinner className="size-3.5" /> Searching…
          </div>
        ) : null}
        <ComboboxList>
          {(item: LeadOption) =>
            item.kind === "user" ? (
              <ComboboxItem
                key={`u:${item.user.id}`}
                value={item}
                className="cursor-pointer"
              >
                <UserAvatar user={item.user} className="h-6 w-6 text-[10px]" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">
                    {item.user.displayName}
                    {me && item.user.id === me.id ? (
                      <span className="text-muted-foreground"> (me)</span>
                    ) : null}
                  </span>
                  {item.user.email ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.user.email}
                    </span>
                  ) : null}
                </span>
              </ComboboxItem>
            ) : (
              <ComboboxItem
                key={`t:${item.name}`}
                value={item}
                className="cursor-pointer"
              >
                <span className="truncate">Use &quot;{item.name}&quot;</span>
              </ComboboxItem>
            )
          }
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
