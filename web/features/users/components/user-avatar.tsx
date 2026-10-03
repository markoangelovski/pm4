"use client";

import type { Me } from "@/features/users/api";

/** "Marko Angelovski" → "MA", "cher" → "C", "  " → "". First letters of the first two words, uppercased. */
export function userInitials(name: string): string {
  void name;
  throw new Error("not implemented (feat-shell-user-menu)");
}

export function UserAvatar(props: {
  user: Pick<Me, "displayName" | "avatarUrl"> | undefined;
  className?: string;
}): React.JSX.Element {
  void props;
  throw new Error("not implemented (feat-shell-user-menu)");
}
