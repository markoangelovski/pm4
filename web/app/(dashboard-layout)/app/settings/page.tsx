import type { Metadata } from "next";
import { PagePlaceholder } from "@/app/components/shared/page-placeholder";

export const metadata: Metadata = {
  title: "Settings"
};

export default function SettingsPage() {
  return <PagePlaceholder title="Settings" milestone="M1" />;
}
