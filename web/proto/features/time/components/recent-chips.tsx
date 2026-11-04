"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** A "Recent:" row of one-click suggestions under a picker. Renders nothing without items. */
export function RecentChips<T extends { id: string; title: string }>({
  label,
  items,
  selectedId,
  hint,
  icon,
  onPick
}: {
  label: string;
  items: readonly T[];
  selectedId: string | null;
  /** Secondary text after an item's title (e.g. a task's project). */
  hint?: (item: T) => string | null;
  /** A leading colour mark (e.g. the project's icon). */
  icon?: (item: T) => ReactNode;
  onPick: (item: T) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="text-xs text-muted-foreground">Recent:</span>
      {items.map((item) => {
        const selected = item.id === selectedId;
        const extra = hint?.(item);
        return (
          <Button
            key={item.id}
            type="button"
            size="xs"
            variant={selected ? "secondary" : "outline"}
            aria-pressed={selected}
            title={extra ? `${item.title} · ${extra}` : item.title}
            onClick={() => onPick(item)}
            className="max-w-full cursor-pointer rounded-md!"
          >
            {icon?.(item)}
            <span className="truncate">{item.title}</span>
            {extra ? (
              <span className="truncate text-muted-foreground">· {extra}</span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
