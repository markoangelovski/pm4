"use client";

import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/proto/lib/routes";

/** The header's To-dos button: an icon link to the Notes page's To-dos tab, styled like the notifications bell. */
export function TodosButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="To-dos"
      title="To-dos"
      className="cursor-pointer rounded-full hover:bg-primary/5"
      nativeButton={false}
      render={<Link href={`${routes.app.notes}?tab=todos`} />}
    >
      <ListChecks size={19} />
    </Button>
  );
}
