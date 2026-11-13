import type { Metadata } from "next";
import { TermsOfService } from "@/proto/features/legal/components/terms-of-service";

export const metadata: Metadata = {
  title: "Terms of service"
};

/** Twin of `app/terms/page.tsx`: the public terms of service (SCR-081). */
export default function ProtoTermsPage() {
  return <TermsOfService />;
}
