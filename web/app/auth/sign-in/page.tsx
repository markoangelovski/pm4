import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import SocialButtons from "../authforms/social-buttons";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-accent px-4">
      <Card className="w-full max-w-md border-none shadow-lg p-6">
        <div className="mx-auto w-fit">
          <Link href="/home/" className="text-lg font-semibold text-foreground">
            PM4
          </Link>
        </div>

        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your Google account to continue.
          </p>
        </div>

        <SocialButtons />
      </Card>
    </div>
  );
}
