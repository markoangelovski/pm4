import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { Suspense } from "react";
import { ViewIdGuard } from "@/app/components/shared/view-id-guard";
import { TaskDetail } from "@/features/tasks/components/task-detail";

export const metadata: Metadata = {
  title: "Task"
};

export default function TaskViewPage() {
  return (
    <Suspense fallback={null}>
      <ViewIdGuard listPath={routes.app.tasks}>
        <TaskDetail />
      </ViewIdGuard>
    </Suspense>
  );
}
