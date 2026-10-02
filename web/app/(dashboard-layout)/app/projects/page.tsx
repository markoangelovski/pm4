import type { Metadata } from "next";
import { PagePlaceholder } from "@/app/components/shared/page-placeholder";

export const metadata: Metadata = {
  title: "Projects"
};

export default function ProjectsPage() {
  return <PagePlaceholder title="Projects" milestone="M2" />;
}
