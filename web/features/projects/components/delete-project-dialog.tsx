"use client";

import { useRouter } from "next/navigation";
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
import { deleteProject, type Project } from "@/features/projects/mock-store";
import { routes } from "@/lib/routes";

/** SCR-021's delete confirmation; confirm → trash, the list and a toast (OQ-086). */
export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onDeleted
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called before the project moves to the trash, so its page can stop rendering it. */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-md!">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project?</AlertDialogTitle>
          <AlertDialogDescription>
            “{project.title}” and its tasks move to the trash. You can restore
            them for 31 days.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="rounded-b-md">
          <AlertDialogCancel className="cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              onDeleted?.();
              router.push(routes.app.projects);
              deleteProject(project.id);
              toast("Moved to trash");
            }}
            className="cursor-pointer"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
