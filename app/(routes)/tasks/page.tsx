"use client";

import Header from "@/components/pm/Header/Header";
import TasksList from "@/components/pm/TasksList/TasksList";
import { mockTasks } from "@/mock";
import { useSearchParams } from "next/navigation";
import TaskDetail from "./task.detail";
import { Suspense } from "react";

function TasksComponent() {
  const searchParams = useSearchParams();

  const taskId = new URLSearchParams(searchParams).get("id");

  if (taskId) return <TaskDetail />;

  return (
    <>
      <Header breadcrumbs={["Tasks"]} />
      <div className="container mx-auto p-4 space-y-6">
        <TasksList tasksList={mockTasks} />
      </div>
    </>
  );
}

export default function Tasks() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TasksComponent />
    </Suspense>
  );
}
