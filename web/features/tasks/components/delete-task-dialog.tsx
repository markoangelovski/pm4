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
import { useDeleteTask, type Task } from "@/features/tasks/api";

/** SCR-031's delete confirmation. */
export function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
  onDeleted
}: {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const deleteTaskMutation = useDeleteTask();
  const pending = deleteTaskMutation.isPending;

  const handleDelete = () => {
    deleteTaskMutation.mutate(task, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted?.();
      },
      onError: () => {
        toast.error("Couldn't delete the task.");
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-md!">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete task?</AlertDialogTitle>
          <AlertDialogDescription>
            “{task.title}” moves to the trash. You can restore it for 31 days.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="rounded-b-md">
          <AlertDialogCancel className="cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
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
