import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  BellRing,
  CalendarClock,
  Download,
  KeyRound,
  ListPlus,
  MoonStar,
  UserX
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import type { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { LandingThemeToggle } from "./landing-theme-toggle";
import { TombstoneIcon } from "@/features/time/components/deleted-marker";
import { ProductTour, PromptCopy } from "./landing-interactive";
import { SmoothScroll } from "./smooth-scroll";
import {
  BookingsScreen,
  DashboardScreen,
  LogsScreen,
  ProjectsScreen
} from "./landing-screens";
import {
  BookingSplit,
  HoursByProject,
  LogTimeForm,
  NotesPicture,
  Panel,
  PmspaPicture,
  ReminderCard,
  RunningTotals,
  TasksPicture
} from "./landing-visuals";

type ButtonProps = ComponentProps<typeof Button>;

/** Renders the "Go to app" / "Login" call to action (FR-LAND-002) in the given style. */
export type LandingCtaSlot = (props: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) => ReactNode;

/** Chart colours, the dashboard's own (features/dashboard). */
const CHART_VARS =
  "[--lp-worked:#2a78d6] [--lp-booked:#1baf7a] [--lp-start:#eb6834] [--lp-nonprod:#a1a1aa] " +
  "dark:[--lp-worked:#3987e5] dark:[--lp-booked:#199e70] dark:[--lp-start:#d95926] dark:[--lp-nonprod:#71717a]";

const NAV = [
  { href: "#time", label: "Time" },
  { href: "#bookings", label: "Bookings" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#projects", label: "Projects" },
  { href: "#notes", label: "Notes" },
  { href: "#faq", label: "FAQ" }
];

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

function Eyebrow({ color, children }: { color: string; children: ReactNode }) {
  return (
    <p className="flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ background: color }}
      />
      {children}
    </p>
  );
}

interface Point {
  title: string;
  text: string;
}

function Points({ points }: { points: Point[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {points.map((p) => (
        <div
          key={p.title}
          className="flex flex-col gap-1 border-l border-border pl-4"
        >
          <dt className="text-sm font-semibold">{p.title}</dt>
          <dd className="text-sm leading-relaxed text-muted-foreground">
            {p.text}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function FeatureSection({
  id,
  eyebrow,
  color,
  title,
  intro,
  points,
  visual,
  reverse,
  muted
}: {
  id: string;
  eyebrow: string;
  color: string;
  title: string;
  intro: string;
  points: Point[];
  visual: ReactNode;
  reverse?: boolean;
  muted?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-16", muted && "bg-muted/40")}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div
          className={cn("flex min-w-0 flex-col gap-5", reverse && "lg:order-2")}
        >
          <Eyebrow color={color}>{eyebrow}</Eyebrow>
          <h2
            id={`${id}-title`}
            className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
          >
            {title}
          </h2>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            {intro}
          </p>
          <div className="mt-2">
            <Points points={points} />
          </div>
        </div>
        <div
          className={cn("flex min-w-0 flex-col gap-4", reverse && "lg:order-1")}
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
    text: "Set when you started. PM4 suggests the current time, rounded to the quarter hour."
  },
  {
    title: "Log as you go",
    text: "A duration and a note per block of work. Project and task are optional."
  },
  {
    title: "Book it",
    text: "Book each log to one or more dates, or copy the day as a prompt."
  },
  {
    title: "See the month",
    text: "Hours worked against your target, what's booked, and where the time went."
  }
];

const EXTRAS: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  text: string;
}[] = [
  {
    icon: ListPlus,
    title: "New from anywhere",
    text: "The New menu creates a project, task, note, to-do or log from any screen. Log time is always one tap away."
  },
  {
    icon: BellRing,
    title: "Reminders to log",
    text: "The bell shows how much of today is still unlogged, with desktop notifications if you turn them on."
  },
  {
    icon: TombstoneIcon,
    title: "Deleted, not forgotten",
    text: "Deleting a project or task is permanent, but its time logs stay and keep its name, marked as deleted."
  },
  {
    icon: CalendarClock,
    title: "Your time zone, your target",
    text: "Days follow your own calendar. Set your time zone and daily target once, in Settings."
  },
  {
    icon: Download,
    title: "Installs as an app",
    text: "Add PM4 to your home screen or desktop. It opens offline and tells you when it can't reach the server."
  },
  {
    icon: KeyRound,
    title: "Google sign-in",
    text: "No password to remember. Sign out on one device, or on all of them at once."
  },
  {
    icon: MoonStar,
    title: "Light and dark",
    text: "PM4 follows your system's theme, and you can switch it from the header."
  },
  {
    icon: UserX,
    title: "Leave any time",
    text: "Delete your account from your profile. Your projects, logs, notes and settings go with it."
  }
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Who can see my data?",
    a: "Only you. Every project, task, log and note belongs to your account alone. PM4 has no teams and no sharing, so nothing you write is visible to another user."
  },
  {
    q: "How do I sign in?",
    a: "With your Google account. PM4 never sees or stores a password. From your profile you can sign out of every device at once."
  },
  {
    q: "Why does every log need a note?",
    a: "Because a duration alone is useless a month later. The note is what you paste into your booking system, and what tells you where the time went when you look back."
  },
  {
    q: "Why 15-minute steps?",
    a: "They keep days easy to add up and book. Type a duration any way you like (1.5, 90, 1:15, 1h 30m) and PM4 stores it in quarter hours, from 15 minutes to 24 hours."
  },
  {
    q: "Do I need PMSPA?",
    a: "No. PM4 works on its own. If your team runs projects in PMSPA, you can connect your account in Settings to import projects and tasks and push your time back."
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. PM4 runs in the browser on any screen size and can be installed to your home screen. Your data stays on the server, so it needs a connection to load and save."
  },
  {
    q: "Can I delete my account?",
    a: "Yes, from your profile. Deleting your account permanently removes your projects, tasks, time logs, bookings, notes, to-dos, settings and integrations."
  }
];

/**
 * The public landing page (SCR-003, FR-LAND-001): what PM4 is and what it can do. The pictures are drawn from
 * sample content; the product tour, the duration field and the prompt's copy button run in the browser on that
 * sample content alone. Only the call to action reads the browser's session (`cta`).
 */
export function LandingPage({ cta }: { cta: LandingCtaSlot }) {
  return (
    <div
      id="top"
      className={cn(
        "flex min-h-screen flex-col bg-background text-foreground",
        CHART_VARS
      )}
    >
      <SmoothScroll />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
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
            {cta({ size: "lg" })}
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
            className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(60rem_28rem_at_50%_-8rem,color-mix(in_oklab,var(--lp-worked)_22%,transparent),transparent),radial-gradient(40rem_24rem_at_85%_0,color-mix(in_oklab,var(--lp-booked)_16%,transparent),transparent)]"
          />
          <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 pt-16 text-center sm:px-6 sm:pt-24">
            <Eyebrow color="var(--lp-booked)">Projects · Tasks · Time</Eyebrow>
            <h1
              id="hero-title"
              className="max-w-4xl text-5xl leading-[1] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl"
            >
              Every hour, accounted for.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
              PM4 keeps your projects and tasks in one place, logs your day in
              15-minute blocks with a note on each, helps you book the time, and
              shows where the month went.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {cta({ size: "lg" })}
              <a
                href="#day"
                className="flex items-center gap-1.5 px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                How a day works
                <ArrowDown className="size-3.5" aria-hidden />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Sign in with Google · Private to your account · Installs as an app
            </p>
          </div>
          <div className="relative mx-auto mt-12 max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
            <ProductTour
              screens={{
                logs: <LogsScreen />,
                bookings: <BookingsScreen />,
                dashboard: <DashboardScreen />,
                projects: <ProjectsScreen />
              }}
            />
          </div>
        </section>

        <section
          id="day"
          aria-labelledby="day-title"
          className="scroll-mt-16 border-y border-border bg-muted/40"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-col items-center gap-4 text-center">
              <Eyebrow color="var(--lp-start)">How a day works</Eyebrow>
              <h2
                id="day-title"
                className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
              >
                From the first standup to the monthly report.
              </h2>
            </div>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background tabular-nums">
                      {i + 1}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "hidden h-px flex-1 bg-border lg:block",
                        i === STEPS.length - 1 && "lg:hidden"
                      )}
                    />
                  </div>
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
          color="var(--lp-worked)"
          title="Type durations the way you think them."
          intro="Write 1.5, 90, 1:15 or 1h 30m and PM4 stores it in 15-minute steps. Every log needs a note, so at the end of the month you still know what the time was for. Go on, try the field."
          points={[
            {
              title: "Four ways to read a day",
              text: "A timeline from your start time, groups by project or by task, or the plain order you worked in."
            },
            {
              title: "Against your target",
              text: "Start, logged, billable share and overtime sit at the top of the day, next to a chart of its logs."
            },
            {
              title: "Non-prod time",
              text: "Mark workshops or admin as excluded from statistics. They count as logged, not as billable."
            },
            {
              title: "A nudge when you forget",
              text: "The bell tells you how much of today is unlogged, and can send a desktop notification."
            }
          ]}
          visual={
            <>
              <LogTimeForm />
              <ReminderCard />
            </>
          }
        />

        <FeatureSection
          id="bookings"
          eyebrow="Bookings"
          color="var(--lp-booked)"
          title="Book what you worked, day by day."
          intro="The Bookings page lists every day in a range with what you logged, what's billable and what's booked. Book a log to the day you worked it, split it across other dates, or book a whole project's day in one click."
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
              title: "A prompt, ready to paste",
              text: "Copy the day as Markdown, per project and task, with the service and duration filled in."
            }
          ]}
          visual={
            <>
              <BookingSplit />
              <Panel label="PM4's booking prompt">
                <PromptCopy />
              </Panel>
            </>
          }
          reverse
          muted
        />

        <FeatureSection
          id="dashboard"
          eyebrow="Dashboard"
          color="var(--lp-start)"
          title="See the month at a glance."
          intro="Pick today, this month, last month, the last 7, 30 or 90 days, this year, or a custom range. The dashboard shows when your days started, how many hours you worked against your target, and how much of it is booked."
          points={[
            {
              title: "Workday chart",
              text: "Start times above, hours per day below, split into booked, not booked and non-prod. Click a bar to open that day."
            },
            {
              title: "Worked, target, booked",
              text: "How far you are over or under your target, and how much is still to book."
            },
            {
              title: "Running totals",
              text: "Worked, target and booked added up day by day across the range."
            },
            {
              title: "Hours by project",
              text: "Every project with hours in the range, most first, with its booked share."
            }
          ]}
          visual={
            <>
              <RunningTotals />
              <HoursByProject />
            </>
          }
        />

        <FeatureSection
          id="projects"
          eyebrow="Projects and tasks"
          color="#8b5cf6"
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
              title: "Time where it belongs",
              text: "Every project and task page charts its logged time by week, booked and not booked."
            },
            {
              title: "Services",
              text: "Give a project its services, link each task to one, and the booking prompt names it."
            }
          ]}
          visual={<TasksPicture />}
          reverse
          muted
        />

        <FeatureSection
          id="notes"
          eyebrow="Notes and to-dos"
          color="#e0a106"
          title="Notes next to the work they're about."
          intro="Write notes in Markdown, with a preview as you go, and keep to-do lists. Link each one to a project, a task or nothing at all. Project and task pages show their own notes and open to-dos."
          points={[
            {
              title: "Grouped to-dos",
              text: "To-dos are grouped by project and task. Tick one off, or add the next one in place."
            },
            {
              title: "Search and filter",
              text: "Find a note by its title or text, and filter by project or by date."
            }
          ]}
          visual={<NotesPicture />}
        />

        <FeatureSection
          id="integrations"
          eyebrow="Integrations"
          color="#0ea5a4"
          title="Connect PMSPA."
          intro="If your team runs projects in PMSPA, connect your account in Settings. Import its projects, tasks and time into PM4, link them to what you already have, and push your own work back."
          points={[
            {
              title: "Import what you need",
              text: "Browse your PMSPA projects and tasks, pick the ones to bring in, and review what will change first."
            },
            {
              title: "Sync and push",
              text: "Sync a project or task from its page, or push a whole day's logs to PMSPA."
            }
          ]}
          visual={<PmspaPicture />}
          reverse
          muted
        />

        <section
          aria-labelledby="extras-title"
          className="border-t border-border"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="flex flex-col gap-4">
              <Eyebrow color="var(--foreground)">Also in PM4</Eyebrow>
              <h2
                id="extras-title"
                className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
              >
                The details that keep a timesheet honest.
              </h2>
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EXTRAS.map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4" aria-hidden />
                  </span>
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
          id="faq"
          aria-labelledby="faq-title"
          className="scroll-mt-16 border-t border-border bg-muted/40"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div className="flex flex-col gap-4">
              <Eyebrow color="var(--lp-worked)">FAQ</Eyebrow>
              <h2
                id="faq-title"
                className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
              >
                Questions, answered.
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                The details are in the{" "}
                <Link
                  href={routes.privacy}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Privacy policy
                </Link>{" "}
                and the{" "}
                <Link
                  href={routes.terms}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Terms
                </Link>
                .
              </p>
            </div>
            <Accordion className="rounded-xl border border-border bg-card px-5">
              {FAQ.map(({ q, a }) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-base">{q}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section aria-labelledby="cta-title" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl bg-foreground px-6 py-16 text-center text-background sm:py-20">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_20%_0,color-mix(in_oklab,var(--lp-worked)_45%,transparent),transparent),radial-gradient(36rem_18rem_at_90%_100%,color-mix(in_oklab,var(--lp-booked)_40%,transparent),transparent)] opacity-60"
              />
              <h2
                id="cta-title"
                className="relative max-w-3xl text-4xl leading-[1] font-semibold tracking-[-0.04em] text-balance sm:text-6xl"
              >
                Start with today.
              </h2>
              <p className="relative max-w-md text-lg leading-relaxed opacity-80">
                Sign in with Google, set when your day started, and write your
                first log.
              </p>
              <div className="relative">
                {cta({ size: "lg", variant: "secondary" })}
              </div>
            </div>
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
