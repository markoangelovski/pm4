/**
 * Sample content for the landing page's pictures (FR-LAND-001). Fictional projects and people: the page shows no
 * user data and makes no API call. Durations and clock times are minutes, as in the app.
 */

export type SampleProjectKey = "orbit" | "atlas" | "internal";

export interface SampleProject {
  name: string;
  /** CSS colour of the project's avatar, bars and chart segments. Reads on light and dark. */
  color: string;
}

export const SAMPLE_PROJECTS: Record<SampleProjectKey, SampleProject> = {
  orbit: { name: "Orbit app", color: "#8b5cf6" },
  atlas: { name: "Atlas website", color: "#0ea5a4" },
  internal: { name: "Internal", color: "#e0a106" }
};

/** Grey of logs excluded from statistics (the app's Non-prod group). */
export const NON_PROD_COLOR = "var(--lp-nonprod)";

export interface SampleLog {
  project: SampleProjectKey | null;
  task?: string;
  text: string;
  /** Minutes after midnight: each log starts where the last one ended. */
  from: number;
  minutes: number;
  excluded?: boolean;
}

/** One workday, in entry order. */
export const SAMPLE_DAY = {
  label: "Tuesday, 3 November 2026",
  start: 8 * 60,
  now: 16 * 60,
  target: 7 * 60,
  logs: [
    {
      project: "internal",
      text: "Standup and sprint planning",
      from: 480,
      minutes: 30
    },
    {
      project: "orbit",
      task: "Checkout",
      text: "Fix address validation on the checkout form",
      from: 510,
      minutes: 120
    },
    {
      project: "orbit",
      task: "Checkout",
      text: "Review PR #412 with Anna",
      from: 630,
      minutes: 45
    },
    {
      project: null,
      text: "Team workshop",
      from: 675,
      minutes: 60,
      excluded: true
    },
    {
      project: "atlas",
      task: "Launch",
      text: "Client call: agree the launch scope",
      from: 735,
      minutes: 60
    },
    {
      project: "atlas",
      task: "Content model",
      text: "Blog and author content types",
      from: 795,
      minutes: 90
    }
  ] satisfies SampleLog[]
};

/** Ten weekdays of the dashboard's workday chart: booked, not booked and non-prod minutes, start time. */
export const SAMPLE_WORKDAYS: {
  day: number;
  booked: number;
  unbooked: number;
  nonProd: number;
  start: number;
}[] = [
  { day: 2, booked: 300, unbooked: 90, nonProd: 0, start: 495 },
  { day: 3, booked: 285, unbooked: 60, nonProd: 60, start: 480 },
  { day: 4, booked: 360, unbooked: 60, nonProd: 0, start: 510 },
  { day: 5, booked: 270, unbooked: 180, nonProd: 30, start: 465 },
  { day: 6, booked: 390, unbooked: 0, nonProd: 0, start: 540 },
  { day: 9, booked: 240, unbooked: 165, nonProd: 0, start: 495 },
  { day: 10, booked: 120, unbooked: 315, nonProd: 0, start: 480 },
  { day: 11, booked: 0, unbooked: 240, nonProd: 60, start: 525 },
  { day: 12, booked: 0, unbooked: 405, nonProd: 0, start: 470 },
  { day: 13, booked: 0, unbooked: 300, nonProd: 30, start: 500 }
];

/** Hours in the dashboard's range per project, most first, with the booked share. */
export const SAMPLE_PROJECT_HOURS: {
  project: SampleProjectKey;
  minutes: number;
  booked: number;
}[] = [
  { project: "orbit", minutes: 1935, booked: 1125 },
  { project: "atlas", minutes: 1410, booked: 720 },
  { project: "internal", minutes: 435, booked: 120 }
];

/** Duration inputs offered as one-tap examples next to the "try it" field (FR-TLOG-010). */
export const DURATION_EXAMPLES = ["1.5", "90", "1:15", "2h 45m", "45m", "20"];

/** The booking prompt for one project's day, as the app writes it. */
export const SAMPLE_PROMPT = `Book my time accordingly:

**Project:** Orbit app
**Task:** Checkout
**Service:** Frontend development
**Date:** 3 Nov 2026
**Duration:** 2h 45m
**Notes:**
- Fix address validation on the checkout form
- Review PR #412 with Anna`;
