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
import { useDeleteLog } from "../api";
import type { TimeLog } from "../types";

/** SCR-042's delete confirmation. */
export function DeleteLogDialog({
  log,
  open,
  onOpenChange
}: {
  log: TimeLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const del = useDeleteLog();
  const handleDelete = async () => {
    try {
      await del.mutateAsync(log);
      toast.success("Log deleted");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't delete the log.");
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-md!">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete log?</AlertDialogTitle>
          <AlertDialogDescription>
            This log is deleted permanently.
          </AlertDialogDescription>
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
