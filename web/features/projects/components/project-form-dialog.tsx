"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/features/users/api";
import { ProjectLeadField } from "@/features/users/components/project-lead-field";
import {
  useCreateProject,
  useUpdateProject,
  type Project
} from "@/features/projects/api";
import {
  PROJECT_FIELD_MAP,
  projectFormDefaults,
  projectFormSchema,
  toProjectInput,
  type ProjectFormValues
} from "@/features/projects/schemas";
import { applyFieldErrors } from "@/lib/api/problem";
import { routes } from "@/lib/routes";

/** SCR-022: create (no `project`) or edit a project. */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-md! sm:max-w-lg">
        {open ? (
          <ProjectForm project={project} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({
  project,
  onDone
}: {
  project?: Project;
  onDone: () => void;
}) {
  const router = useRouter();
  const { data: me } = useMe();
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? "");
  const pending = create.isPending || update.isPending;
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: projectFormDefaults(project, me)
  });

  function onFailure(error: unknown) {
    if (!applyFieldErrors(error, setError, PROJECT_FIELD_MAP)) {
      toast.error("Couldn't save the project.");
    }
  }

  const onSubmit = handleSubmit((values) => {
    const input = toProjectInput(values);
    if (project) {
      update.mutate(input, { onSuccess: onDone, onError: onFailure });
    } else {
      create.mutate(input, {
        onSuccess: (created) => {
          toast.success("Project created");
          onDone();
          router.push(`${routes.app.project}?id=${created.id}`);
        },
        onError: onFailure
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        <DialogDescription className="sr-only">
          {project ? "Change the project's details." : "Create a project."}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="project-title">Title</FieldLabel>
          <Input
            id="project-title"
            autoFocus
            {...register("title")}
            aria-invalid={!!errors.title || undefined}
          />
          <FieldError errors={[errors.title]} />
        </Field>
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="project-description">Description</FieldLabel>
          <Textarea
            id="project-description"
            rows={4}
            {...register("description")}
            aria-invalid={!!errors.description || undefined}
          />
          <FieldError errors={[errors.description]} />
        </Field>
        <Field data-invalid={!!errors.externalLink}>
          <FieldLabel htmlFor="project-link">External link</FieldLabel>
          <Input
            id="project-link"
            type="url"
            placeholder="https://"
            {...register("externalLink")}
            aria-invalid={!!errors.externalLink || undefined}
          />
          <FieldError errors={[errors.externalLink]} />
        </Field>
        <Field data-invalid={!!errors.lead}>
          <FieldLabel htmlFor="project-lead">Project lead</FieldLabel>
          <Controller
            control={control}
            name="lead"
            render={({ field, fieldState }) => (
              <ProjectLeadField
                id="project-lead"
                value={field.value}
                onChange={field.onChange}
                invalid={fieldState.invalid}
                disabled={field.disabled}
              />
            )}
          />
          <FieldError errors={[errors.lead]} />
        </Field>
      </FieldGroup>
      <DialogFooter className="rounded-b-md">
        <DialogClose
          render={
            <Button
              variant="outline"
              type="button"
              className="cursor-pointer"
            />
          }
        >
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending} className="cursor-pointer">
          {project
            ? pending
              ? "Saving…"
              : "Save"
            : pending
              ? "Creating…"
              : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
