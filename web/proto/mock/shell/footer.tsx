import Link from "next/link";
import { routes } from "@/proto/lib/routes";

// The footer is on every page and always in the viewport, so default <Link> prefetching would
// re-request the landing page after each navigation. Plain click-to-load is enough.
export default function Footer() {
  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">
        © 2026 by{" "}
        <Link
          href={routes.landing}
          prefetch={false}
          className="hover:text-primary text-muted-foreground"
        >
          PM4
        </Link>
        , better project management for you.
      </p>
    </div>
  );
}
