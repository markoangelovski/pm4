import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Geist_Mono } from "next/font/google";
import {
  ArrowDown,
  BellRing,
  CalendarClock,
  Download,
  KeyRound,
  ListPlus,
  MoonStar,
  ShieldCheck
} from "lucide-react";
import type { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { TombstoneIcon } from "@/features/time/components/deleted-marker";
import {
  BookingDay,
  BookingPrompt,
  DashboardChart,
  DayTimeline,
  DurationParser,
  NotesTodos,
  PmspaSync,
  ProjectRows
} from "./landing-vignettes";
import { LandingThemeToggle } from "./landing-theme-toggle";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono"
});

type ButtonProps = ComponentProps<typeof Button>;

/** Renders the header's "Go to app" / "Login" call to action (FR-LAND-002) in the given style. */
export type LandingCtaSlot = (props: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) => ReactNode;

/** Chart colours, the dashboard's own (features/dashboard). */
const CHART_VARS =
  "[--landing-worked:#2a78d6] [--landing-booked:#1baf7a] [--landing-start:#eb6834] [--landing-nonprod:#a1a1aa] " +
  "dark:[--landing-worked:#3987e5] dark:[--landing-booked:#199e70] dark:[--landing-start:#d95926] dark:[--landing-nonprod:#71717a]";

const NAV = [
  { href: "#time", label: "Time" },
  { href: "#bookings", label: "Bookings" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#projects", label: "Projects" },
  { href: "#notes", label: "Notes" }
];

/** 15-minute ruling, stronger every hour: the grid every duration in PM4 snaps to. */
const QUARTER_HOUR_GRID =
  "bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_right,color-mix(in_oklab,var(--border)_45%,transparent)_1px,transparent_1px)] " +
  "bg-[size:96px_100%,24px_100%]";

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2" aria-label="PM4">
      <Image
        src="/images/logos/logoicon.svg"
        alt=""
        width={28}
        height={28}
        className="size-7"
      />
      <span className="text-base font-semibold tracking-tight">PM4</span>
    </a>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
      <span aria-hidden className="flex flex-col gap-[2px]">
        <span className="h-[2px] w-2 bg-foreground" />
        <span className="ml-[3px] h-[2px] w-2 bg-foreground" />
        <span className="ml-[6px] h-[2px] w-2 bg-foreground" />
      </span>
      {children}
    </p>
  );
}

interface Point {
  title: string;
  text: string;
}

function FeatureSection({
  id,
  eyebrow,
  title,
  intro,
  points,
  visual,
  reverse
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  points: Point[];
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-20 border-t border-border"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-12 lg:gap-12">
        <div
          className={cn(
            "flex min-w-0 flex-col gap-5 lg:col-span-5",
            reverse && "lg:order-2"
          )}
        >
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2
            id={`${id}-title`}
            className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
          >
            {title}
          </h2>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            {intro}
          </p>
          <dl className="mt-2 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {points.map((p) => (
              <div key={p.title} className="flex flex-col gap-1">
                <dt className="text-sm font-semibold">{p.title}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  {p.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div
          className={cn(
            "flex min-w-0 flex-col gap-4 lg:col-span-7",
            reverse && "lg:order-1"
          )}
        >
          {visual}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Start the day",
    text: "Set when you started. PM4 suggests the current time, rounded to the nearest quarter hour."
  },
  {
    title: "Log as you go",
    text: "Each block of work gets a duration and a note saying what you did. A project and task are optional."
  },
  {
    title: "Book it",
    text: "Book each log to one or more dates, all of it or part, and copy the day as a prompt for Slack."
  },
  {
    title: "See the month",
    text: "The dashboard shows hours worked against your target, what's booked, and where the time went."
  }
];

const EXTRAS: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  text: string;
}[] = [
  {
    icon: BellRing,
    title: "Reminders to log",
    text: "A bell in the header shows how much of today is still unlogged, with desktop notifications if you want them."
  },
  {
    icon: ListPlus,
    title: "New from anywhere",
    text: "The New menu creates a project, task, note, to-do or log from any screen. The Log time button is always one tap away."
  },
  {
    icon: TombstoneIcon,
    title: "Deleted, not forgotten",
    text: "Deleting a project or task is permanent, but its time logs stay and keep its name, marked as deleted."
  },
  {
    icon: CalendarClock,
    title: "Your time zone",
    text: "Days follow your own calendar. Set your time zone and daily target once, in your profile and settings."
  },
  {
    icon: Download,
    title: "Installs as an app",
    text: "Add PM4 to your home screen or desktop. It opens even offline and tells you when it can't reach the server."
  },
  {
    icon: ShieldCheck,
    title: "Private to you",
    text: "Every project, task and log belongs to your account alone. Nothing is shared with other users."
  },
  {
    icon: KeyRound,
    title: "Google sign-in",
    text: "Sign in with your Google account. Sign out on one device, or on all of them at once."
  },
  {
    icon: MoonStar,
    title: "Light and dark",
    text: "PM4 follows your system's theme, and you can switch it from the header."
  }
];

/**
 * The public landing page (SCR-003, FR-LAND-001): what PM4 is and what it can do. Fully static: the
 * illustrations are drawn from sample content, and only the call to action reads the browser (`cta`).
 */
export function LandingPage({ cta }: { cta: LandingCtaSlot }) {
  return (
    <div
      id="top"
      className={cn(
        "flex min-h-screen flex-col bg-background text-foreground",
        geistMono.variable,
        CHART_VARS
      )}
    >
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Sections" className="hidden md:block">
            <ul className="flex items-center gap-6 text-sm text-muted-foreground">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            <LandingThemeToggle />
            {cta({ variant: "outline", size: "sm" })}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section
          aria-labelledby="hero-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]",
              QUARTER_HOUR_GRID
            )}
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
              <Eyebrow>Projects · Tasks · Time</Eyebrow>
              <h1
                id="hero-title"
                className="text-5xl leading-[0.95] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-[3.75rem] xl:text-[4rem]"
              >
                Every hour, accounted for.
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                PM4 keeps your projects and tasks in one place, logs your day in
                15-minute blocks with a note on each, helps you book the time,
                and shows where the month went.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {cta({ size: "lg" })}
                <a
                  href="#day"
                  className="flex items-center gap-1.5 px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  How a day works
                  <ArrowDown className="size-3.5" aria-hidden />
                </a>
              </div>
            </div>
            <div className="min-w-0 lg:col-span-7">
              <DayTimeline />
            </div>
          </div>
        </section>

        <section
          id="day"
          aria-labelledby="day-title"
          className="scroll-mt-20 border-t border-border bg-muted/40"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-col gap-4">
              <Eyebrow>How a day works</Eyebrow>
              <h2
                id="day-title"
                className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
              >
                From the first standup to the monthly report.
              </h2>
            </div>
            <ol className="mt-10 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="flex flex-col gap-3 bg-background p-6"
                >
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <FeatureSection
          id="time"
          eyebrow="Time logs"
          title="Type durations the way you think them."
          intro="Write 1.5, 90, 1:15 or 1h 30m; PM4 stores it in 15-minute steps. Every log needs a note, so at the end of the month you still know what the time was for."
          points={[
            {
              title: "Three ways to read a day",
              text: "Group logs by project or by task, or list them in the order you worked."
            },
            {
              title: "Against your target",
              text: "A chart of the day's logs shows what's left of your daily target, with billable share and overtime in the header."
            },
            {
              title: "Non-prod time",
              text: "Mark workshops or admin as excluded from statistics. They still count as logged, but not as billable."
            },
            {
              title: "Logged where it belongs",
              text: "Every project and task page shows its logged time, how much of it is booked, and the logs themselves."
            }
          ]}
          visual={<DurationParser />}
        />

        <FeatureSection
          id="bookings"
          eyebrow="Bookings"
          title="Book what you worked, day by day."
          intro="The Bookings page lists every day in a range with what you logged, what's billable and what's booked. Book a log to the day you worked it, split it across other dates, or book a whole project's day at once."
          points={[
            {
              title: "Part or all",
              text: "Book all of a log's time or only part of it, to as many dates as you need."
            },
            {
              title: "Book all",
              text: "One click books every unbooked log of a project to the day it was worked."
            },
            {
              title: "Both ends linked",
              text: "A log booked to another day shows where it went, and that day shows where it came from."
            },
            {
              title: "A prompt for Slack",
              text: "Copy the day's logs as Markdown, per project and task, with the service and duration filled in."
            }
          ]}
          visual={
            <>
              <BookingDay />
              <BookingPrompt />
            </>
          }
          reverse
        />

        <FeatureSection
          id="dashboard"
          eyebrow="Dashboard"
          title="See the month at a glance."
          intro="Pick today, this month, last month, the last 7, 30 or 90 days, this year, or a custom range of up to a year. The dashboard shows when your days started, how many hours you worked against your target, and how much of it is booked."
          points={[
            {
              title: "Workday chart",
              text: "Start times above, hours worked per day below, split into booked, not booked and non-prod."
            },
            {
              title: "Worked, target, booked",
              text: "How far you are over or under your target for the range, and how much is still to book."
            },
            {
              title: "Running totals",
              text: "Worked, target and booked added up day by day, running on to the end of the range."
            },
            {
              title: "Hours by project",
              text: "Every project with hours in the range, most first, with its booked share."
            }
          ]}
          visual={<DashboardChart />}
        />

        <FeatureSection
          id="projects"
          eyebrow="Projects and tasks"
          title="Projects and tasks, without the overhead."
          intro="A project has a lead, a description, an external link and the services it offers. Its tasks have a status, a due date and a lead. Lists show progress and logged time, and you can search, filter and sort them."
          points={[
            {
              title: "Status in one click",
              text: "Change a task's status straight from the list: upcoming, in progress or completed."
            },
            {
              title: "Due dates that warn you",
              text: "Overdue and due-soon tasks are marked in every list, using your own time zone."
            },
            {
              title: "Move tasks between projects",
              text: "A task's time logs move with it, so project totals stay right."
            },
            {
              title: "Services",
              text: "Give a project its services, link each task to one, and the booking prompt names it."
            }
          ]}
          visual={<ProjectRows />}
          reverse
        />

        <FeatureSection
          id="notes"
          eyebrow="Notes and to-dos"
          title="Notes next to the work they're about."
          intro="Write notes in Markdown and keep to-do lists, each linked to a project, a task or nothing at all. Project and task pages show their own notes and open to-dos."
          points={[
            {
              title: "Grouped to-dos",
              text: "To-dos are grouped by project and task. Tick one off and it stays in place, struck through."
            },
            {
              title: "Search and filter",
              text: "Find a note by its title or text, and filter by project or by date."
            }
          ]}
          visual={<NotesTodos />}
        />

        <FeatureSection
          id="integrations"
          eyebrow="Integrations"
          title="Connect PMSPA."
          intro="If your team runs projects in PMSPA, connect your account in Settings. Import its projects and tasks into PM4, keep them in sync, and push your own work back."
          points={[
            {
              title: "Import what you need",
              text: "Browse your PMSPA records and pick which ones to bring into PM4."
            },
            {
              title: "Sync and push",
              text: "From a project or task page, sync it with PMSPA or push it there."
            }
          ]}
          visual={<PmspaSync />}
          reverse
        />

        <section
          aria-labelledby="extras-title"
          className="border-t border-border bg-muted/40"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-col gap-4">
              <Eyebrow>Also in PM4</Eyebrow>
              <h2
                id="extras-title"
                className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
              >
                The details that keep a timesheet honest.
              </h2>
            </div>
            <ul className="mt-10 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
              {EXTRAS.map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="flex flex-col gap-2 bg-background p-6"
                >
                  <Icon className="size-5" aria-hidden />
                  <h3 className="mt-2 text-sm font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="cta-title"
          className="relative overflow-hidden border-t border-border"
        >
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]",
              QUARTER_HOUR_GRID
            )}
          />
          <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 sm:py-28">
            <h2
              id="cta-title"
              className="max-w-3xl text-4xl leading-[1] font-semibold tracking-[-0.04em] text-balance sm:text-6xl"
            >
              Start with today.
            </h2>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Sign in with Google, set when your day started, and write your
              first log.
            </p>
            {cta({ size: "lg" })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col gap-2">
            <Logo />
            <p className="text-sm text-muted-foreground">
              Projects, tasks and time tracking.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {[...NAV, { href: "#integrations", label: "Integrations" }].map(
                (n) => (
                  <li key={n.href}>
                    <a
                      href={n.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {n.label}
                    </a>
                  </li>
                )
              )}
              {/* FR-LEGAL-003, OQ-276 */}
              <li>
                <Link
                  href={routes.privacy}
                  className="transition-colors hover:text-foreground"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href={routes.terms}
                  className="transition-colors hover:text-foreground"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
