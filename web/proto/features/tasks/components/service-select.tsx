"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useProject } from "@/proto/features/projects/api";

const NONE = { value: null, label: "No service" };

/** SCR-032's Service: **No service**, then the chosen project's services. Disabled until a project is chosen, and
 *  while the project has none or its services failed to load. */
export function ServiceSelect({
  id,
  projectId,
  value,
  onChange,
  invalid
}: {
  id?: string;
  projectId: string | null;
  value: string | null;
  onChange: (serviceId: string | null) => void;
  invalid?: boolean;
}) {
  const project = useProject(projectId ?? "", projectId !== null);
  const services = projectId ? (project.data?.services ?? []) : [];
  const items = [
    NONE,
    ...services.map((s) => ({ value: s.id as string | null, label: s.name }))
  ];
  const disabled = services.length === 0;
  const placeholder = !projectId
    ? "Choose a project first"
    : project.isPending
      ? "Loading…"
      : project.isError
        ? "Couldn't load the services"
        : services.length === 0
          ? "This project has no services"
          : "No service";

  return (
    <Select
      // Disabled: no items, so the box shows why (the placeholder) instead of No service's label.
      items={disabled ? [] : items}
      value={value}
      onValueChange={(v) => onChange(v ?? null)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        className="w-full cursor-pointer rounded-md!"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem
            key={item.value ?? "none"}
            value={item.value}
            className="cursor-pointer"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
