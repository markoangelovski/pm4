import { UserAvatar } from "@/features/users/components/user-avatar";
import type { components } from "@/lib/api/schema";

/** user → avatar + name; text → the name; null → "—". */
export function ProjectLeadLabel({
  lead
}: {
  lead: components["schemas"]["ProjectLeadDto"] | null;
}): React.JSX.Element {
  if (!lead) return <span className="text-muted-foreground">—</span>;
  if (lead.kind === "user" && lead.user) {
    return (
      <span className="flex items-center gap-2">
        <UserAvatar user={lead.user} className="h-6 w-6 text-xs" />
        <span>{lead.user.displayName}</span>
      </span>
    );
  }
  return <span>{lead.name}</span>;
}
