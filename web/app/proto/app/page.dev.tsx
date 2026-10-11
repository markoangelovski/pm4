import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/proto/features/dashboard/components/dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard"
};

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardView />
    </Suspense>
  );
}
