import { z } from "zod";
import type { Project, ProjectInput } from "@/features/projects/api";
import type { Me } from "@/features/users/api";
import {
  fromProjectLead,
  isHttpUrl,
  LEAD_NAME_MAX,
  leadFromMe,
  leadToInput,
  type LeadValue
} from "@/features/users/lead";

/** SCR-022's create/edit form. */
export const projectFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(200, "Use at most 200 characters."),
  description: z.string().max(2000, "Use at most 2000 characters."),
  externalLink: z
    .string()
    .trim()
    .max(500, "Use at most 500 characters.")
    .refine(
      (v) => v === "" || isHttpUrl(v),
      "Enter a full link starting with http:// or https://."
    ),
  lead: z
    .custom<LeadValue>()
    .refine(
      (v) => v?.kind !== "text" || v.name.trim().length <= LEAD_NAME_MAX,
      "Use at most 100 characters."
    )
});

export type ProjectFormValues = z.input<typeof projectFormSchema>;

/** Edit: the project's values; create: empty, with the signed-in user as the lead. */
export function projectFormDefaults(
  project: Project | undefined,
  me: Me | undefined
): ProjectFormValues {
  if (project) {
    return {
      title: project.title,
      description: project.description ?? "",
      externalLink: project.externalLink ?? "",
      lead: fromProjectLead(project.projectLead)
    };
  }
  return { title: "", description: "", externalLink: "", lead: leadFromMe(me) };
}

/** Form values → the API body: "" → null; the lead via leadToInput. */
export function toProjectInput(values: ProjectFormValues): ProjectInput {
  const title = values.title.trim();
  const externalLink = values.externalLink.trim();
  return {
    title,
    description: values.description.trim() === "" ? null : values.description,
    externalLink: externalLink === "" ? null : externalLink,
    ...leadToInput(values.lead)
  };
}

/** API error field → form field. */
export const PROJECT_FIELD_MAP = {
  title: "title",
  description: "description",
  externalLink: "externalLink",
  projectLeadUserId: "lead",
  projectLeadName: "lead"
} as const;
