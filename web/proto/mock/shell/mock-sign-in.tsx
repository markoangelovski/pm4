"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleButton } from "@/proto/features/auth/components/google-button";
import { routes } from "@/proto/lib/routes";

/**
 * Prototype stand-ins for the sign-in page's session parts (never promoted). The alert shows the same texts as
 * production's `SignInState` for `?error=cancelled|not-allowed|rate-limited|<other>`; the button opens the app.
 */
export function MockSignInState() {
  const error = useSearchParams().get("error");
  if (error === null) return null;
  const message =
    error === "cancelled"
      ? "Sign-in was cancelled."
      : error === "rate-limited"
        ? "Too many sign-in attempts. Try again in a minute."
        : error === "not-allowed"
          ? "This account isn't allowed to use PM4. Continue with Google to choose a different account."
          : "Sign-in failed. Please try again.";
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function MockGoogleButton() {
  const router = useRouter();
  return <GoogleButton onClick={() => router.push(routes.app.dashboard)} />;
}
