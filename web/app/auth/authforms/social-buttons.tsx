"use client";

import { GoogleButton } from "@/features/auth/components/google-button";
import { RETURN_TO_PARAM } from "@/lib/auth/return-to";
import { googleSignInUrl } from "@/lib/auth/session";

/**
 * Google-only sign-in (template-adaptation.md: no password/2FA forms): starts API-AUTH-001 with the page's
 * `returnTo`.
 */
const SocialButtons = () => (
  <GoogleButton
    onClick={() => {
      window.location.assign(
        googleSignInUrl(
          new URLSearchParams(window.location.search).get(RETURN_TO_PARAM)
        )
      );
    }}
  />
);

export default SocialButtons;
