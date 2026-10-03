import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectsList } from "@/features/projects/components/projects-list";

export const metadata: Metadata = {
  title: "Projects"
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsList />
    </Suspense>
  );
}
