"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { RETURN_TO_PARAM } from "@/lib/auth/return-to";
import { googleSignInUrl } from "@/lib/auth/session";

/**
 * Google-only sign-in (template-adaptation.md: no password/2FA forms).
 */
const SocialButtons = () => {
  return (
    <div className="flex items-center justify-center gap-3 w-full">
      <Button
        variant="outline"
        className="h-9 shadow-xs flex-1 gap-2 px-5! py-2! rounded-lg text-sm font-medium dark:bg-background hover:cursor-pointer w-full"
        onClick={() => {
          window.location.assign(
            googleSignInUrl(
              new URLSearchParams(window.location.search).get(RETURN_TO_PARAM)
            )
          );
        }}
      >
        <Image
          src="/images/svgs/google-icon.svg"
          alt=""
          width={16}
          height={16}
          className="w-4 h-4"
        />
        Continue with Google
      </Button>
    </div>
  );
};

export default SocialButtons;
