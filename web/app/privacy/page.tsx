import type { Metadata } from "next";
import { PrivacyPolicy } from "@/features/legal/components/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy policy"
};

/** SCR-080 (FR-LEGAL-001): the public privacy policy. Static, outside the dashboard layout. */
export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
