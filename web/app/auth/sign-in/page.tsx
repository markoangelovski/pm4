import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInPage } from "@/features/auth/components/sign-in-page";
import { SignInState } from "@/features/auth/components/sign-in-state";
import SocialButtons from "../authforms/social-buttons";

export const metadata: Metadata = {
  title: "Sign in"
};

/** The sign-in page (SCR-001), outside the app shell. */
export default function SignInRoute() {
  return (
    <SignInPage
      state={
        <Suspense fallback={null}>
          <SignInState />
        </Suspense>
      }
      button={<SocialButtons />}
    />
  );
}
