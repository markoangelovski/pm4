import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInPage } from "@/proto/features/auth/components/sign-in-page";
import {
  MockGoogleButton,
  MockSignInState
} from "@/proto/mock/shell/mock-sign-in";

export const metadata: Metadata = {
  title: "Sign in"
};

/** Twin of `app/auth/sign-in/page.tsx` (SCR-001). Try `?error=cancelled`, `not-allowed`, `rate-limited`, `failed`. */
export default function ProtoSignInPage() {
  return (
    <SignInPage
      state={
        <Suspense fallback={null}>
          <MockSignInState />
        </Suspense>
      }
      button={<MockGoogleButton />}
    />
  );
}
