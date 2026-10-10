import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsView } from "@/features/settings/components/settings-view";

export const metadata: Metadata = {
  title: "Settings"
};

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsView />
    </Suspense>
  );
}
