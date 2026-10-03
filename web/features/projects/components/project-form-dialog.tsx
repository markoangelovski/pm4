"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  createProject,
  isHttpUrl,
  LEAD_NAME_MAX,
  updateProject,
  type LeadValue,
  type Project,
  type ProjectInput
} from "@/features/projects/mock-store";
import { routes } from "@/lib/routes";

interface FormValues {
  title: string;
  description: string;
  externalLink: string;
  lead: LeadValue;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

function validate(v: FormValues): FormErrors {
  const errors: FormErrors = {};
  const title = v.title.trim();
  if (!title) errors.title = "Enter a title.";
  else if (title.length > 200) errors.title = "Use at most 200 characters.";
  if (v.description.length > 2000)
    errors.description = "Use at most 2000 characters.";
  const link = v.externalLink.trim();
  if (link.length > 500) errors.externalLink = "Use at most 500 characters.";
  else if (link && !isHttpUrl(link))
    errors.externalLink =
      "Enter a full link starting with http:// or https://.";
  if (v.lead?.kind === "text" && v.lead.name.trim().length > LEAD_NAME_MAX)
    errors.lead = "Use at most 100 characters.";
  return errors;
}

function toInput(v: FormValues): ProjectInput {
  const lead =
    v.lead?.kind === "text"
      ? v.lead.name.trim()
        ? { kind: "text" as const, name: v.lead.name.trim() }
        : null
      : v.lead;
  return {
    title: v.title.trim(),
    description: v.description.trim() ? v.description : null,
    externalLink: v.externalLink.trim() || null,
    lead
  };
}

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
  const [values, setValues] = useState<FormValues>(() => ({
    title: project?.title ?? "",
    description: project?.description ?? "",
    externalLink: project?.externalLink ?? "",
    lead: project ? project.lead : me ? { kind: "user", user: me } : null
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    setPending(true);
    // Simulated request latency, so the pending state can be reviewed.
    setTimeout(() => {
      if (project) {
        updateProject(project.id, toInput(values));
        onDone();
      } else {
        const created = createProject(toInput(values));
        toast.success("Project created");
        onDone();
        router.push(`${routes.app.project}?id=${created.id}`);
      }
    }, 400);
  }

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
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            aria-invalid={!!errors.title || undefined}
          />
          <FieldError>{errors.title}</FieldError>
        </Field>
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="project-description">Description</FieldLabel>
          <Textarea
            id="project-description"
            rows={4}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            aria-invalid={!!errors.description || undefined}
          />
          <FieldError>{errors.description}</FieldError>
        </Field>
        <Field data-invalid={!!errors.externalLink}>
          <FieldLabel htmlFor="project-link">External link</FieldLabel>
          <Input
            id="project-link"
            type="url"
            placeholder="https://"
            value={values.externalLink}
            onChange={(e) => set("externalLink", e.target.value)}
            aria-invalid={!!errors.externalLink || undefined}
          />
          <FieldError>{errors.externalLink}</FieldError>
        </Field>
        <Field data-invalid={!!errors.lead}>
          <FieldLabel htmlFor="project-lead">Project lead</FieldLabel>
          <ProjectLeadField
            id="project-lead"
            value={values.lead}
            onChange={(lead) => set("lead", lead)}
            invalid={!!errors.lead}
          />
          <FieldError>{errors.lead}</FieldError>
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
