import type { Metadata } from "next";
import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = {
  title: "Signing in",
};

/**
 * TODO(M1): exchange `code` for a session (and honor `returnTo`) against the
 * API, then redirect. Placeholder spinner only for now.
 */
export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">Signing in…</p>
    </div>
  );
}
