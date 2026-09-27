import type { Metadata } from "next";
import { PagePlaceholder } from "@/app/components/shared/page-placeholder";

export const metadata: Metadata = {
  title: "Trash",
};

export default function TrashPage() {
  return <PagePlaceholder title="Trash" milestone="M4" />;
}
