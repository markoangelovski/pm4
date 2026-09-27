"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ViewIdGuardProps {
  /** The list route to redirect (replace) to when `id` is missing or empty. */
  listPath: string;
  children: ReactNode;
}

/**
 * Reads `id` from the query string (routing.md's entity routes:
 * `/projects/view/?id=…`, `/tasks/view/?id=…`). Missing or empty `id`
 * redirects (replace) to the list. Must be rendered inside a `<Suspense>`
 * boundary (static-export.md: `useSearchParams` needs one).
 *
 * `children` is a plain element (not a render-prop function): a Server
 * Component page can pass it straight through without crossing the
 * server/client boundary with a function value.
 */
export function ViewIdGuard({ listPath, children }: ViewIdGuardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    if (!id) {
      router.replace(listPath);
    }
  }, [id, listPath, router]);

  if (!id) {
    return null;
  }

  return <>{children}</>;
}
