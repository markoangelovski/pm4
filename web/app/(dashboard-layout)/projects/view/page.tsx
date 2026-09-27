import type { Metadata } from "next";
import { Suspense } from "react";
import { ViewIdGuard } from "@/app/components/shared/view-id-guard";
import { PagePlaceholder } from "@/app/components/shared/page-placeholder";

export const metadata: Metadata = {
  title: "Project",
};

export default function ProjectViewPage() {
  return (
    <Suspense fallback={null}>
      <ViewIdGuard listPath="/projects/">
        <PagePlaceholder title="Project" milestone="M2" />
      </ViewIdGuard>
    </Suspense>
  );
}
