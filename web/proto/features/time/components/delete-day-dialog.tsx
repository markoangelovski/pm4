"use client";

import { format, parseISO } from "date-fns";
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
import { formatDuration } from "@/lib/time";
import { useDeleteDay } from "../api";
import type { Day } from "../types";

/** What deleting the day removes: its start, and its logs with their bookings. */
function describe(day: Day): string {
  const date = format(parseISO(day.workDate), "EEEE, d MMMM yyyy");
  const n = day.logs.length;
  if (n === 0) return `${date}: its start time will be deleted permanently.`;
  const logs = `${n} ${n === 1 ? "log" : "logs"} (${formatDuration(day.totalMinutes)})`;
  return `${date}: its start time and its ${logs} will be deleted permanently, with their bookings.`;
}

/** SCR-040's Delete day confirmation (API-WD-004). The view stays on the now empty date. */
export function DeleteDayDialog({
  day,
  open,
  onOpenChange
}: {
  day: Day;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const del = useDeleteDay();
  const handleDelete = async () => {
    try {
      await del.mutateAsync(day.workDate);
      toast.success("Day deleted");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't delete the day.");
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-md!">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete day?</AlertDialogTitle>
          <AlertDialogDescription>{describe(day)}</AlertDialogDescription>
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
