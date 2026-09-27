import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "PM4 — Projects, tasks and time tracking",
};

/**
 * Public landing page (SCR-003, FR-LAND-001/002). Outside the app shell and
 * its auth guard, with its own marketing header.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <span className="text-lg font-semibold text-foreground">PM4</span>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/auth/sign-in/" />}
          >
            Login
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-semibold text-foreground">
          Projects, tasks and time — in one place
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          PM4 is a simple project manager: create projects and tasks, and log
          the time you spend on them.
        </p>
        <Button render={<Link href="/auth/sign-in/" />}>Login</Button>
      </main>
    </div>
  );
}
