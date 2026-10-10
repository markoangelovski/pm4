import type { Metadata } from "next";
import { Suspense } from "react";
import { DayView } from "@/features/time/components/day-view";

export const metadata: Metadata = {
  title: "Logs"
};

export default function TimePage() {
  return (
    <Suspense fallback={null}>
      <DayView />
    </Suspense>
  );
}
