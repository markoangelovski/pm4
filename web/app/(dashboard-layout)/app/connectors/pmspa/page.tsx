import type { Metadata } from "next";
import { Suspense } from "react";
import { PmspaConnector } from "@/features/integrations/components/pmspa-connector";

export const metadata: Metadata = {
  title: "PMSPA"
};

export default function PmspaConnectorPage() {
  return (
    <Suspense fallback={null}>
      <PmspaConnector />
    </Suspense>
  );
}
