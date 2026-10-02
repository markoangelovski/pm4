import type { Metadata } from "next";
import { PagePlaceholder } from "@/app/components/shared/page-placeholder";

export const metadata: Metadata = {
  title: "Tasks"
};

export default function TasksPage() {
  return <PagePlaceholder title="Tasks" milestone="M2" />;
}
