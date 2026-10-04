import type { Metadata } from "next";
import { Suspense } from "react";
import { TasksList } from "@/features/tasks/components/tasks-list";

export const metadata: Metadata = {
  title: "Tasks"
};

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksList />
    </Suspense>
  );
}
