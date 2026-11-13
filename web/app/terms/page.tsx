import type { Metadata } from "next";
import { TermsOfService } from "@/features/legal/components/terms-of-service";

export const metadata: Metadata = {
  title: "Terms of service"
};

/** SCR-081 (FR-LEGAL-002): the public terms of service. Static, outside the dashboard layout. */
export default function TermsPage() {
  return <TermsOfService />;
}
