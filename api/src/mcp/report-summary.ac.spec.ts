import type { DashboardReportResponseDto } from "../time/dto/dashboard-report-response.dto.js";
import { summarizeReport, weekdaysBetween } from "./report-summary.js";

describe("report-summary (feat-mcp-tools-api)", () => {
  it("AC-14 FR-RPT-004: weekdaysBetween counts Monday–Friday dates in [from, to]", () => {
    expect(weekdaysBetween("2026-01-01", "2026-01-04")).toBe(2);
    expect(weekdaysBetween("2026-01-05", "2026-01-11")).toBe(5);
    expect(weekdaysBetween("2026-01-03", "2026-01-03")).toBe(0);
  });

  it("AC-14 FR-RPT-004: weekdaysBetween is 0 when to is before from", () => {
    expect(weekdaysBetween("2026-01-09", "2026-01-05")).toBe(0);
  });

  it("AC-14 FR-RPT-004: summarizeReport sums the days and multiplies the target", () => {
    const report: DashboardReportResponseDto = {
      days: [
        {
          workDate: "2026-01-01",
          startMinute: 540,
          workedMinutes: 120,
          bookedMinutes: 30,
          nonprodMinutes: 10
        },
        {
          workDate: "2026-01-02",
          startMinute: null,
          workedMinutes: 60,
          bookedMinutes: 15,
          nonprodMinutes: 5
        },
        {
          workDate: "2026-01-03",
          startMinute: null,
          workedMinutes: 30,
          bookedMinutes: 0,
          nonprodMinutes: 20
        }
      ],
      projects: [
        {
          kind: "project",
          project: { id: "p1", title: "P", deleted: false },
          workedMinutes: 180,
          bookedMinutes: 45
        },
        { kind: "nonprod", project: null, workedMinutes: 30, bookedMinutes: 0 }
      ]
    };

    const summary = summarizeReport(report, "2026-01-01", "2026-01-04", 420);

    expect(summary).toEqual({
      from: "2026-01-01",
      to: "2026-01-04",
      workedMinutes: 210,
      bookedMinutes: 45,
      nonprodMinutes: 35,
      weekdays: 2,
      dailyTargetMinutes: 420,
      targetMinutes: 840,
      projects: report.projects
    });
  });
});
