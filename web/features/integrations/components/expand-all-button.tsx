"use client";

import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The connector page's tables: **Expand all** until every row shown is open, then **Collapse all**. Disabled
 * while there's nothing to expand.
 */
export function ExpandAllButton({
  expanded,
  disabled,
  size = "default",
  onExpandedChange
}: {
  /** Every row shown is open. */
  expanded: boolean;
  disabled?: boolean;
  size?: "default" | "sm";
  onExpandedChange: (expanded: boolean) => void;
}) {
  return (
    <Button
      variant="outline"
      size={size}
      className="cursor-pointer"
      disabled={disabled}
      onClick={() => onExpandedChange(!expanded)}
    >
      {expanded ? (
        <ChevronsDownUp data-icon="inline-start" />
      ) : (
        <ChevronsUpDown data-icon="inline-start" />
      )}
      {expanded ? "Collapse all" : "Expand all"}
    </Button>
  );
}
