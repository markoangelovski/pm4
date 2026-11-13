import type { Me } from "@/features/users/api";

/** SCR-051's Delete account card (FR-AUTH-008). Stub until feat-acct-web T2. */
export function DeleteAccountCard({
  me
}: {
  me: Me | undefined;
}): React.JSX.Element {
  void me;
  throw new Error("not implemented (feat-acct-web)");
}
