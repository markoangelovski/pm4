"use client";

import { catchError, type ErrorInfo } from "next/error";
import { Button } from "@/components/ui/button";

/**
 * Component-level error boundary via Next.js 16.3 `catchError`.
 * Does not interfere with `notFound()` / `redirect()`, and `retry()` re-renders children
 * (including Server Components).
 */
function RouteErrorFallback(
  props: { title?: string },
  { error, retry }: ErrorInfo
) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected error occurred.";

  return (
    <div className="flex min-h-[24vh] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        {props.title ?? "Something went wrong"}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}

export default catchError(RouteErrorFallback);
