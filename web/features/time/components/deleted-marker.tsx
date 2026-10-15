import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A tombstone in lucide's style (24×24, 2px round stroke): lucide-react has none (OQ-149).
 * Custom because no shadcn or lucide icon fits.
 */
export function TombstoneIcon({
  className,
  children,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      {...props}
    >
      {children}
      <path d="M6 21V10a6 6 0 0 1 12 0v11" />
      <path d="M4 21h16" />
      <path d="M12 8v6" />
      <path d="M10 10h4" />
    </svg>
  );
}

/** The deleted marker (SCR-042, FR-TLOG-014): the tombstone, named "deleted" for assistive tech. */
export function DeletedMarker({ className }: { className?: string }) {
  return (
    <TombstoneIcon
      role="img"
      aria-label="deleted"
      className={cn("size-3.5 shrink-0", className)}
    >
      <title>Deleted</title>
    </TombstoneIcon>
  );
}

/** A deleted task's or project's name: plain text followed by the deleted marker. */
export function DeletedName({
  title,
  className
}: {
  title: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1 text-muted-foreground",
        className
      )}
    >
      <span className="truncate">{title}</span>
      <DeletedMarker />
    </span>
  );
}
