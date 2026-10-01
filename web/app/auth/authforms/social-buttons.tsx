"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

/**
 * Google-only sign-in (template-adaptation.md: no password/2FA forms).
 * TODO(M1): wire up Google OAuth (Authorization Code + PKCE) via the API.
 */
const SocialButtons = () => {
  return (
    <div className="flex items-center justify-center gap-3 w-full">
      <Button
        variant="outline"
        className="h-9 shadow-xs flex-1 gap-2 px-5! py-2! rounded-lg text-sm font-medium dark:bg-background hover:cursor-pointer w-full"
        onClick={() => {
          /* TODO(M1): start the Google OAuth flow, passing sanitizeReturnTo(searchParams.get(RETURN_TO_PARAM)) as API-AUTH-001's returnTo (omit it when null). */
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
