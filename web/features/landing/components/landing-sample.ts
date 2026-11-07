/**
 * Sample content for the landing page's illustrations (FR-LAND-001). Fictional projects and people: the page
 * shows no user data and makes no API call. Durations are minutes, as in the app.
 */

export type SampleProjectKey = "orbit" | "atlas" | "internal";

export interface SampleProject {
  name: string;
  /** CSS colour for the project's dot and bars. */
  color: string;
}

export const SAMPLE_PROJECTS: Record<SampleProjectKey, SampleProject> = {
  orbit: { name: "Orbit app", color: "var(--chart-2)" },
  atlas: { name: "Atlas website", color: "var(--chart-1)" },
  internal: { name: "Internal", color: "var(--chart-4)" }
};

/** Grey of logs excluded from statistics (the app's Non-prod group). */
export const NON_PROD_COLOR = "var(--landing-nonprod)";

export interface SampleLog {
  project: SampleProjectKey | null;
  task?: string;
  text: string;
  minutes: number;
  excluded?: boolean;
}

/** One workday, in entry order. */
export const SAMPLE_DAY = {
  label: "Tuesday, 3 November",
  /** Minutes after midnight. */
  start: 8 * 60,
  now: 16 * 60,
  target: 7 * 60,
  logs: [
    {
      project: "internal",
      text: "Standup and sprint planning",
      minutes: 30
    },
    {
      project: "orbit",
      task: "Checkout",
      text: "Fix address validation on the checkout form",
      minutes: 120
    },
    {
      project: "orbit",
      task: "Checkout",
      text: "Review PR #412 with Anna",
      minutes: 45
    },
    {
      project: "atlas",
      task: "Launch",
      text: "Client call: agree the launch scope",
      minutes: 60
    },
    {
      project: "atlas",
      task: "Content model",
      text: "Blog and author content types",
      minutes: 90
    },
    {
      project: null,
      text: "Team workshop",
      minutes: 60,
      excluded: true
    }
  ] satisfies SampleLog[]
};

/** What the duration field accepts, and what it stores (FR-TLOG-010). `null`: a field error. */
export const DURATION_EXAMPLES: { input: string; result: string | null }[] = [
  { input: "1.5", result: "1h 30m" },
  { input: "90", result: "1h 30m" },
  { input: "1:15", result: "1h 15m" },
  { input: "8", result: "8h" },
  { input: "45m", result: "45m" },
  { input: "20", result: null }
];

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
