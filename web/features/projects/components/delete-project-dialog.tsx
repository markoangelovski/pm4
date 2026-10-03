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
import { useDeleteProject, type Project } from "@/features/projects/api";
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
  /** Called after the project moved to the trash, so its page stops fetching and rendering it. */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const deleteProject = useDeleteProject();
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
            disabled={deleteProject.isPending}
            onClick={() =>
              deleteProject.mutate(project.id, {
                onSuccess: () => {
                  onDeleted?.();
                  router.push(routes.app.projects);
                  toast("Moved to trash");
                },
                onError: () => toast.error("Couldn't delete the project.")
              })
            }
            className="cursor-pointer"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
