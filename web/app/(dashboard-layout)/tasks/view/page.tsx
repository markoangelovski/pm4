import type { Metadata } from "next";
import { Suspense } from "react";
import { ViewIdGuard } from "@/app/components/shared/view-id-guard";
import { PagePlaceholder } from "@/app/components/shared/page-placeholder";

export const metadata: Metadata = {
  title: "Task",
};

export default function TaskViewPage() {
  return (
    <Suspense fallback={null}>
      <ViewIdGuard listPath="/tasks/">
        <PagePlaceholder title="Task" milestone="M2" />
      </ViewIdGuard>
    </Suspense>
  );
}
