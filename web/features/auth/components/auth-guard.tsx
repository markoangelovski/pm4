"use client";

/** Wraps the app shell: renders children only once a session is known (D11). */
export function AuthGuard({
  children
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  throw new Error("not implemented (feat-auth-web-session)");
}
