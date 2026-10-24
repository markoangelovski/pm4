"use client";

import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteNote, useDeleteTodo } from "../api";

const COPY = {
  note: {
    title: "Delete note?",
    body: "This note is deleted permanently.",
    done: "Note deleted",
    failed: "Couldn't delete the note."
  },
  todo: {
    title: "Delete to-do?",
    body: "This to-do is deleted permanently.",
    done: "To-do deleted",
    failed: "Couldn't delete the to-do."
  }
} as const;

/** The delete confirmation of a note or a to-do. */
export function DeleteItemDialog({
  kind,
  id,
  open,
  onOpenChange
}: {
  kind: "note" | "todo";
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const delNote = useDeleteNote();
  const delTodo = useDeleteTodo();
  const del = kind === "note" ? delNote : delTodo;
  const copy = COPY[kind];
  const handleDelete = async () => {
    try {
      await del.mutateAsync(id);
      toast.success(copy.done);
      onOpenChange(false);
    } catch {
      toast.error(copy.failed);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-md!">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="rounded-b-md">
          <AlertDialogCancel className="cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={del.isPending}
            onClick={handleDelete}
            className="cursor-pointer"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
