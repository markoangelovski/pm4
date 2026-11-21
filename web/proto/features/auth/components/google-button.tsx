"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

/**
 * The "Continue with Google" button of the sign-in page (SCR-001), in the landing page's large button size.
 * What a click does is the caller's: production starts API-AUTH-001, the prototype opens the app.
 */
export function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-11 w-full gap-2.5 rounded-xl bg-background text-sm font-medium shadow-xs hover:cursor-pointer"
      onClick={onClick}
    >
      <Image
        src="/images/svgs/google-icon.svg"
        alt=""
        width={18}
        height={18}
        className="size-[18px]"
      />
      Continue with Google
    </Button>
  );
}
