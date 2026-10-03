"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RETURN_TO_PARAM, postSignInPath } from "@/lib/auth/return-to";
import { getRefreshToken } from "@/lib/auth/token-store";

/** The sign-in error alert, and the signed-in forward (D4). Render inside <Suspense>. */
export function SignInState(): React.JSX.Element | null {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = signInErrorMessage(searchParams.get("error"));
  const returnTo = searchParams.get(RETURN_TO_PARAM);

  useEffect(() => {
    if (getRefreshToken() !== null) router.replace(postSignInPath(returnTo));
  }, [returnTo, router]);

  if (message === null) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/** The alert text for the `?error=` reason, or null. */
export function signInErrorMessage(error: string | null): string | null {
  if (error === null) return null;
  if (error === "cancelled") return "Sign-in was cancelled.";
  if (error === "not-allowed") {
    return "This account isn't allowed to use PM4. Continue with Google to choose a different account.";
  }
  return "Sign-in failed. Please try again.";
}
