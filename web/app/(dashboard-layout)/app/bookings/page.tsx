import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingsView } from "@/features/bookings/components/bookings-view";

export const metadata: Metadata = {
  title: "Bookings"
};

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsView />
    </Suspense>
  );
}
