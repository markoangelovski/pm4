"use client";

import { UserAvatar } from "@/features/users/components/user-avatar";
import type { LeadValue } from "@/features/projects/mock-store";

/** user → avatar + name; text → the name; null → "—". */
export function ProjectLeadLabel({ lead }: { lead: LeadValue }) {
  if (!lead) return <span className="text-muted-foreground">—</span>;
  if (lead.kind === "text") return <span>{lead.name}</span>;
  return (
    <span className="flex items-center gap-2">
      <UserAvatar user={lead.user} className="h-6 w-6 text-xs" />
      <span>{lead.user.displayName}</span>
    </span>
  );
}
