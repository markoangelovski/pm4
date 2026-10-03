"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Me } from "@/features/users/api";

/** "Marko Angelovski" → "MA", "cher" → "C", "  " → "". First letters of the first two words, uppercased. */
export function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0].toUpperCase())
    .join("");
}

export function UserAvatar({
  user,
  className
}: {
  user: Pick<Me, "displayName" | "avatarUrl"> | undefined;
  className?: string;
}): React.JSX.Element {
  return (
    <Avatar className={className}>
      {user?.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : null}
      <AvatarFallback className="bg-primary text-primary-foreground">
        {user ? userInitials(user.displayName) : ""}
      </AvatarFallback>
    </Avatar>
  );
}
