import Link from "next/link";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-semibold text-foreground">404</h1>
      <p className="text-sm text-muted-foreground">
        This page could not be found.
      </p>
      <Button render={<Link href={routes.landing} />}>Go back home</Button>
    </div>
  );
}
