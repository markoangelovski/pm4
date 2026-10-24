import type { Metadata } from "next";
import { Suspense } from "react";
import { NotesView } from "@/features/notes/components/notes-view";

export const metadata: Metadata = {
  title: "Notes"
};

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesView />
    </Suspense>
  );
}
