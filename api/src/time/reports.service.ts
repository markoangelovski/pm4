import { BadRequestException, Injectable } from "@nestjs/common";
import { RefDto } from "../common/dto/ref.dto.js";
import {
  DashboardReportResponseDto,
  type ReportProjectDto,
  type ReportDayDto
} from "./dto/dashboard-report-response.dto.js";
import { WorkdaysQueryDto } from "./dto/workdays-query.dto.js";
import { type ReportProjectRow, TimeRepository } from "./time.repository.js";
import { assertDate, daysBetween } from "./time-logs.service.js";

const MAX_RANGE_DAYS = 366;

/** The `Ref` of a project row: the live project, else the retained name (data-model.md *Retained names*). */
function toProjectRef(row: ReportProjectRow): RefDto | null {
  if (row.projectTitle !== null) {
    return { id: row.projectId, title: row.projectTitle, deleted: false };
  }
  if (row.deletedProjectTitle !== null) {
    return { id: null, title: row.deletedProjectTitle, deleted: true };
  }
  return null;
}

const KIND_ORDER = { project: 0, unsorted: 1, nonprod: 2 } as const;

/** Order: `project` rows by worked minutes (desc) then title, then `unsorted`, then `nonprod`. */
function compareProjects(a: ReportProjectDto, b: ReportProjectDto): number {
  const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  if (byKind !== 0) return byKind;
  if (a.kind !== "project") return 0;
  const byWorked = b.workedMinutes - a.workedMinutes;
  if (byWorked !== 0) return byWorked;
  return (a.project?.title ?? "").localeCompare(b.project?.title ?? "");
}

/** The dashboard report (API-RPT-001), always the caller's own. */
@Injectable()
export class ReportsService {
  constructor(private readonly timeRepository: TimeRepository) {}

  async dashboard(
    userId: string,
    query: WorkdaysQueryDto
  ): Promise<DashboardReportResponseDto> {
    assertDate(query.from, "from");
    assertDate(query.to, "to");
    const days = daysBetween(query.from, query.to);
    if (days < 0 || days > MAX_RANGE_DAYS) {
      throw new BadRequestException({
        errors: [
          {
            field: "to",
            message: `must not be before from and at most ${MAX_RANGE_DAYS} days after it`
          }
        ]
      });
    }
    const [dayRows, projectRows] = await Promise.all([
      this.timeRepository.reportDays(userId, query.from, query.to),
      this.timeRepository.reportProjects(userId, query.from, query.to)
    ]);
    const projects: ReportProjectDto[] = projectRows.map((row) => ({
      kind: row.kind,
      project: row.kind === "project" ? toProjectRef(row) : null,
      workedMinutes: row.workedMinutes,
      bookedMinutes: row.bookedMinutes
    }));
    projects.sort(compareProjects);
    const dayDtos: ReportDayDto[] = dayRows.map((row) => ({
      workDate: row.workDate,
      startMinute: row.startMinute,
      workedMinutes: row.workedMinutes,
      bookedMinutes: row.bookedMinutes
    }));
    return { days: dayDtos, projects };
  }
}
