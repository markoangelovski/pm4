"use client";

import { Button } from "@/components/ui/button";

/**
 * UI PROTOTYPE ONLY: lets the reviewer see the loading, empty and error states that the in-memory
 * store never produces. Removed when the API is connected.
 */
export function PrototypeStateSwitch<S extends string>({
  states,
  value,
  onChange
}: {
  states: readonly S[];
  value: S;
  onChange: (state: S) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-chart-4 px-3 py-2 text-xs">
      <span className="font-medium text-chart-4">Prototype · show state:</span>
      {states.map((s) => (
        <Button
          key={s}
          size="xs"
          variant={s === value ? "default" : "outline"}
          onClick={() => onChange(s)}
          className="cursor-pointer"
        >
          {s}
        </Button>
      ))}
    </div>
  );
}
