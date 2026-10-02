import type { Metadata } from "next";
import { PagePlaceholder } from "@/app/components/shared/page-placeholder";

export const metadata: Metadata = {
  title: "Time"
};

export default function TimePage() {
  return <PagePlaceholder title="Time" milestone="M3" />;
}
