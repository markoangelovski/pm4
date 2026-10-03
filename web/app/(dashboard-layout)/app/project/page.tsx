import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { Suspense } from "react";
import { ViewIdGuard } from "@/app/components/shared/view-id-guard";
import { ProjectDetail } from "@/features/projects/components/project-detail";

export const metadata: Metadata = {
  title: "Project"
};

export default function ProjectViewPage() {
  return (
    <Suspense fallback={null}>
      <ViewIdGuard listPath={routes.app.projects}>
        <ProjectDetail />
      </ViewIdGuard>
    </Suspense>
  );
}
