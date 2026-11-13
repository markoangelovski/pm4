import type { Metadata } from "next";
import { PrivacyPolicy } from "@/proto/features/legal/components/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy policy"
};

/** Twin of `app/privacy/page.tsx`: the public privacy policy (SCR-080). */
export default function ProtoPrivacyPage() {
  return <PrivacyPolicy />;
}
