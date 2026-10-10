import type { components } from "@/lib/api/schema";

export type TimeLog = components["schemas"]["TimeLogResponseDto"];
export type Ref = NonNullable<TimeLog["project"]>;
export type Day = components["schemas"]["DayResponseDto"];
export type ProjectRef = { id: string; title: string };
export type TaskRef = { id: string; title: string; project: ProjectRef };
export interface TimeLogInput {
  workDate: string;
  durationMinutes: number;
  text: string;
  title: string | null;
  excludeFromStats: boolean;
  projectId?: string | null;
  taskId?: string | null;
  dayStartMinute?: number;
}
export type DayView = "project" | "task" | "sequential";
