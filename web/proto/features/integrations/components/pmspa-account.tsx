import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle
} from "@/components/ui/item";
import type { PmspaConnection } from "../api";

/** The first letters of an email's name part, for an avatar without an image ("mock.user@…" → "MU"). */
function initials(email: string): string {
  const parts = email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean);
  return (
    parts.length > 1 ? parts[0][0] + parts[1][0] : email.slice(0, 2)
  ).toUpperCase();
}

/** OQ-166: the PMSPA account PM4 is signed in as (PMSPA users have an avatar and a role, no name). */
export function PmspaAccount({
  connection,
  actions,
  className
}: {
  connection: PmspaConnection;
  /** E.g. the status badge and Refresh on the connector page. */
  actions?: React.ReactNode;
  className?: string;
}) {
  const account = connection.account;
  if (!account) return null;
  const host = connection.url ? new URL(connection.url).host : null;
  return (
    <Item variant="outline" className={className ?? "rounded-md! max-w-md"}>
      <ItemMedia>
        <Avatar className="size-10">
          {account.avatarUrl ? (
            <AvatarImage src={account.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>{initials(account.email)}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="max-w-full">
          <span className="truncate">{account.email}</span>
          <Badge variant="secondary" className="shrink-0 font-normal">
            {account.role === "admin" ? "Admin" : "User"}
          </Badge>
        </ItemTitle>
        <ItemDescription>Signed in to {host ?? "PMSPA"}</ItemDescription>
      </ItemContent>
      {actions ? <ItemActions>{actions}</ItemActions> : null}
    </Item>
  );
}
