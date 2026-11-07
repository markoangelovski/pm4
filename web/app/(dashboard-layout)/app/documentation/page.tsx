import type { Metadata } from "next";
import { Suspense } from "react";
import { DocumentationView } from "@/features/documentation/components/documentation-view";

export const metadata: Metadata = {
  title: "Documentation"
};

export default function DocumentationPage() {
  return (
    <Suspense fallback={null}>
      <DocumentationView />
    </Suspense>
  );
}
