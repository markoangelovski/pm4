// Project services (prototype): API shapes that lib/api/schema.d.ts doesn't have yet. `npm run api:types` replaces
// them after the API task.

/** A service a project offers ("Backend development", …): a name unique within its project, case-insensitive. */
export interface ProjectServiceDto {
  id: string;
  name: string;
  /** The project's tasks linked to it (SCR-022 warns before removing a service in use). */
  taskCount: number;
}

/** A task's link to one of its project's services. */
export interface ServiceRefDto {
  id: string;
  name: string;
}

/** Added to ProjectResponseDto: the project's services, by name. */
export interface ProjectServicesFields {
  services: ProjectServiceDto[];
}

/** Added to the project's create and update bodies: the full list of names. A name already on the project keeps
 *  its service (matched case-insensitively), a new name adds one, and a missing name deletes it; its tasks lose it. */
export interface ProjectServicesInput {
  services: string[];
}

/** Added to TaskResponseDto. */
export interface TaskServiceFields {
  service: ServiceRefDto | null;
}

/** Added to the task's create and update bodies: one of the task's project's services, or none. Another project's
 *  service → 400 on `serviceId`. */
export interface TaskServiceInput {
  serviceId: string | null;
}

export const SERVICE_NAME_MAX = 50;
export const SERVICES_MAX = 20;
