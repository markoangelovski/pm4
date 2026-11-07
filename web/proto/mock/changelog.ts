// Changelog seed of the UI prototype: PM4's real release history (web-v… / api-v… tags), generated from git on
// 2026-11-07. Each app's first release is what its next deploy would ship (every feat/fix since its last tag),
// dated today. Prototype-only, never promoted.
import { today } from "@/lib/time";
import type { ChangelogReleaseDto } from "@/proto/features/documentation/proposed-types";
import { MOCK_TZ } from "./seed";

const todayStr = today(MOCK_TZ);

export const changelogSeed: ChangelogReleaseDto[] = [
  {
    app: "api",
    version: "0.7.0",
    tag: "api-v0.7.0",
    date: todayStr,
    commitCount: 35,
    changes: [
      {
        type: "feat",
        scope: null,
        description:
          "project management lists (feat-prj-lists): notes title:asc in the API, web twins (T-0140, T-0141)",
        breaking: false,
        hash: "5afae1d"
      },
      {
        type: "feat",
        scope: null,
        description:
          "dashboard report nonprodMinutes (T-0130, feat-rpt-api D5)",
        breaking: false,
        hash: "4b1fd3c"
      },
      {
        type: "feat",
        scope: null,
        description: "API rate limiting (T-0125…T-0128, feat-api-rate-limit)",
        breaking: false,
        hash: "270a0cb"
      },
      {
        type: "fix",
        scope: null,
        description: "project services review follow-ups (T-0120, T-0121)",
        breaking: false,
        hash: "54a888e"
      },
      {
        type: "feat",
        scope: null,
        description: "project services (feat-prj-services)",
        breaking: false,
        hash: "cb75bf7"
      },
      {
        type: "feat",
        scope: null,
        description: "PM4 logo and favicons in web and api (T-0109, T-0110)",
        breaking: false,
        hash: "255c941"
      },
      {
        type: "feat",
        scope: null,
        description:
          "notes and to-dos API and web pages (feat-note-todos, T-0103…T-0105)",
        breaking: false,
        hash: "c3770a4"
      },
      {
        type: "feat",
        scope: null,
        description:
          "Logged time chart with days on GET /time-logs, Billable (%), Bookings day links, Statistics link (T-0099, T-0100)",
        breaking: false,
        hash: "3ecbdb2"
      },
      {
        type: "fix",
        scope: "api",
        description:
          "add the 0009 journal entry so drop_booking_date runs; T-0095 done, T-0096 queued",
        breaking: false,
        hash: "8778c3e"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "drop time_logs.booking_date, no booking data copied (T-0095)",
        breaking: false,
        hash: "395a8e6"
      },
      {
        type: "feat",
        scope: null,
        description:
          "partial bookings, a log booked in parts to several dates (T-0092…T-0094)",
        breaking: false,
        hash: "9722f45"
      },
      {
        type: "feat",
        scope: null,
        description:
          "PMSPA follow-ups: preview warnings, created-in-PMSPA dates, per-connection tokens, Expand all (T-0086–T-0088)",
        breaking: false,
        hash: "ee871dd"
      },
      {
        type: "feat",
        scope: null,
        description:
          "PMSPA call budget: rate limit, lean reads, lazy days and candidates (T-0081–T-0085)",
        breaking: false,
        hash: "ef93477"
      },
      {
        type: "fix",
        scope: "api",
        description:
          "PMSPA import failure reason counts the imported logs (OQ-196)",
        breaking: false,
        hash: "3af6000"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "PMSPA time API: days, time import and day push (T-0074–T-0078)",
        breaking: false,
        hash: "1c9a7cd"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "PMSPA sync API: links, previews and commits (T-0069–T-0073)",
        breaking: false,
        hash: "f74695d"
      },
      {
        type: "feat",
        scope: "api",
        description: "PMSPA connection API and client (T-0064–T-0068)",
        breaking: false,
        hash: "75325a2"
      }
    ]
  },
  {
    app: "web",
    version: "0.6.0",
    tag: "web-v0.6.0",
    date: todayStr,
    commitCount: 117,
    changes: [
      {
        type: "feat",
        scope: "web",
        description: "Open Graph tags on the landing page (T-0148)",
        breaking: false,
        hash: "199021e"
      },
      {
        type: "feat",
        scope: "web",
        description: "landing redesign: full marketing page (T-0147)",
        breaking: false,
        hash: "1da5350"
      },
      {
        type: "feat",
        scope: "web",
        description: "desktop notifications for the log-time reminder (T-0146)",
        breaking: false,
        hash: "2f05865"
      },
      {
        type: "feat",
        scope: "web",
        description: "header To-dos button (T-0145)",
        breaking: false,
        hash: "9ed3563"
      },
      {
        type: "feat",
        scope: "web",
        description: "Today range preset in Statistics and Bookings (T-0144)",
        breaking: false,
        hash: "9ef1473"
      },
      {
        type: "fix",
        scope: "web",
        description: "log dialog task picker hides done tasks (T-0143)",
        breaking: false,
        hash: "09af9d6"
      },
      {
        type: "fix",
        scope: "web",
        description:
          "hide the done toggle when no done to-dos are left (T-0142)",
        breaking: false,
        hash: "de3cb16"
      },
      {
        type: "feat",
        scope: null,
        description:
          "project management lists (feat-prj-lists): notes title:asc in the API, web twins (T-0140, T-0141)",
        breaking: false,
        hash: "5afae1d"
      },
      {
        type: "fix",
        scope: "web",
        description:
          "stronger highlight on the picked Recent chip (T-0139, feat-tlog-recent-links)",
        breaking: false,
        hash: "f700bbc"
      },
      {
        type: "fix",
        scope: "web",
        description:
          "a Recent project chip that clears the task clears its error (T-0138, feat-tlog-recent-links)",
        breaking: false,
        hash: "94f1ba7"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "Log time Recent project and task chips (T-0136, feat-tlog-recent-links)",
        breaking: false,
        hash: "188bd2a"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "reminder counts all logs since the start, target only billable (T-0135, feat-tlog-reminder-all-logged)",
        breaking: false,
        hash: "62e17f5"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "billable Remaining and reminder, auto-open Log time (T-0134, feat-tlog-billable-reminder)",
        breaking: false,
        hash: "33a059f"
      },
      {
        type: "feat",
        scope: null,
        description:
          "log presets, group +, reminder bell, Prompt Edit, wider dialogs (T-0132, T-0133, feat-tlog-reminder)",
        breaking: false,
        hash: "5ce6f79"
      },
      {
        type: "feat",
        scope: null,
        description:
          "dashboard Non-prod out of worked (T-0131, feat-rpt-web D9)",
        breaking: false,
        hash: "63dc1bb"
      },
      {
        type: "feat",
        scope: null,
        description:
          "dashboard report nonprodMinutes (T-0130, feat-rpt-api D5)",
        breaking: false,
        hash: "4b1fd3c"
      },
      {
        type: "feat",
        scope: null,
        description: "dashboard weekday target (T-0129, feat-rpt-web D8)",
        breaking: false,
        hash: "8ec6082"
      },
      {
        type: "feat",
        scope: null,
        description: "API rate limiting (T-0125…T-0128, feat-api-rate-limit)",
        breaking: false,
        hash: "270a0cb"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "day menu: Go to Bookings, Push to PMSPA in the menu (T-0124, feat-tlog-day-menu, OQ-252)",
        breaking: false,
        hash: "ddf1112"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "Running totals without empty days, aligned Workdays hover (T-0123, feat-rpt-web D6/D7)",
        breaking: false,
        hash: "b141c02"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "Prompt Duration line and Notes label (T-0122, feat-tlog-prompt D9)",
        breaking: false,
        hash: "71b1834"
      },
      {
        type: "fix",
        scope: null,
        description: "project services review follow-ups (T-0120, T-0121)",
        breaking: false,
        hash: "54a888e"
      },
      {
        type: "feat",
        scope: null,
        description: "project services (feat-prj-services)",
        breaking: false,
        hash: "cb75bf7"
      },
      {
        type: "fix",
        scope: "web",
        description:
          "Log time button: a key press after a touch swipe is never swallowed (T-0115)",
        breaking: false,
        hash: "4b213c5"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "New menu with project/task/log, floating swipeable Log time button (feat-shell-new-menu, T-0114)",
        breaking: false,
        hash: "da98a48"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "installable PWA, app shell offline, offline banner (feat-shell-pwa, T-0112, T-0113)",
        breaking: false,
        hash: "f5b911d"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "PM4 loading animation instead of the spinner while the session is checked (T-0111)",
        breaking: false,
        hash: "6a9ff92"
      },
      {
        type: "feat",
        scope: null,
        description: "PM4 logo and favicons in web and api (T-0109, T-0110)",
        breaking: false,
        hash: "255c941"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "projects list expandable task rows (feat-prj-task-rows, T-0108)",
        breaking: false,
        hash: "d5d672c"
      },
      {
        type: "feat",
        scope: "web",
        description: "default light/dark mode to the system setting",
        breaking: false,
        hash: "0d871a5"
      },
      {
        type: "fix",
        scope: "web",
        description:
          "PMSPA rate-limit refresh no longer misses a call that settles between renders (T-0107)",
        breaking: false,
        hash: "ef06988"
      },
      {
        type: "feat",
        scope: null,
        description:
          "notes and to-dos API and web pages (feat-note-todos, T-0103…T-0105)",
        breaking: false,
        hash: "c3770a4"
      },
      {
        type: "fix",
        scope: "web",
        description:
          "bookings: reject unsafe log ids in link hashes, move Expand all out of the day heading (T-0102)",
        breaking: false,
        hash: "bc5a73f"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "bookings range presets, project filter, expand/collapse all, booking links (T-0101)",
        breaking: false,
        hash: "8716da2"
      },
      {
        type: "feat",
        scope: null,
        description:
          "Logged time chart with days on GET /time-logs, Billable (%), Bookings day links, Statistics link (T-0099, T-0100)",
        breaking: false,
        hash: "3ecbdb2"
      },
      {
        type: "feat",
        scope: null,
        description:
          "partial bookings, a log booked in parts to several dates (T-0092…T-0094)",
        breaking: false,
        hash: "9722f45"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "time: editable notes in the Prompt dialog, copied as edited (T-0091)",
        breaking: false,
        hash: "722dd1d"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "time: Prompt dialog with fixed header and footer, scrolling body (T-0090)",
        breaking: false,
        hash: "7dc6839"
      },
      {
        type: "feat",
        scope: "web",
        description: "time: Prompt item and dialog for Slack booking (T-0089)",
        breaking: false,
        hash: "00362cf"
      },
      {
        type: "fix",
        scope: "web",
        description:
          "open long time selects below the trigger instead of item-aligned",
        breaking: false,
        hash: "75fff87"
      },
      {
        type: "feat",
        scope: null,
        description:
          "PMSPA follow-ups: preview warnings, created-in-PMSPA dates, per-connection tokens, Expand all (T-0086–T-0088)",
        breaking: false,
        hash: "ee871dd"
      },
      {
        type: "feat",
        scope: null,
        description:
          "PMSPA call budget: rate limit, lean reads, lazy days and candidates (T-0081–T-0085)",
        breaking: false,
        hash: "ef93477"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "PMSPA connector web: Settings tab, connector page, sync and push (T-0079–T-0080)",
        breaking: false,
        hash: "25b3ce5"
      },
      {
        type: "fix",
        scope: "api",
        description:
          "PMSPA import failure reason counts the imported logs (OQ-196)",
        breaking: false,
        hash: "3af6000"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "PMSPA time API: days, time import and day push (T-0074–T-0078)",
        breaking: false,
        hash: "1c9a7cd"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "PMSPA sync API: links, previews and commits (T-0069–T-0073)",
        breaking: false,
        hash: "f74695d"
      },
      {
        type: "feat",
        scope: "api",
        description: "PMSPA connection API and client (T-0064–T-0068)",
        breaking: false,
        hash: "75325a2"
      }
    ]
  },
  {
    app: "web",
    version: "0.5.0",
    tag: "web-v0.5.0",
    date: "2026-10-15",
    commitCount: 4,
    changes: [
      {
        type: "feat",
        scope: null,
        description:
          "permanent delete of projects and tasks, Delete day (T-0060–T-0062)",
        breaking: false,
        hash: "101a26f"
      }
    ]
  },
  {
    app: "web",
    version: "0.4.0",
    tag: "web-v0.4.0",
    date: "2026-10-11",
    commitCount: 16,
    changes: [
      {
        type: "feat",
        scope: "scripts",
        description:
          "pm4 compares production files with their prototype twins (T-0058)",
        breaking: false,
        hash: "74f052f"
      },
      {
        type: "feat",
        scope: null,
        description:
          "prototype sync: logged time, Dashboard and Bookings from the prototype (feat-proto-sync-web)",
        breaking: false,
        hash: "94b9f91"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "dashboard: hooks, range picker, tiles, charts and totals (feat-rpt-web)",
        breaking: false,
        hash: "c41ee50"
      },
      {
        type: "feat",
        scope: "api",
        description: "dashboard report: GET /reports/dashboard (feat-rpt-api)",
        breaking: false,
        hash: "1a6c73b"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "bookings: the booking hooks and the Bookings page (feat-book-web)",
        breaking: false,
        hash: "d61f850"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "bookings: booking_date, GET/PUT /bookings, clearing on edit (feat-book-api)",
        breaking: false,
        hash: "1a05430"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "time logging: the Logs day view, the log dialog and settings (feat-tlog-web)",
        breaking: false,
        hash: "be0ffa1"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "time logging: workdays, time logs and the daily target (feat-tlog-api)",
        breaking: false,
        hash: "eae1c2e"
      },
      {
        type: "feat",
        scope: "web",
        description: "drop the Terms and Privacy footer links",
        breaking: false,
        hash: "d3c69de"
      }
    ]
  },
  {
    app: "web",
    version: "0.3.0",
    tag: "web-v0.3.0",
    date: "2026-10-04",
    commitCount: 7,
    changes: [
      {
        type: "feat",
        scope: "web",
        description:
          "task lists, detail, create/edit dialog and inline status (feat-tsk-web)",
        breaking: false,
        hash: "f31b455"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "tasks module, CRUD, filters, move and restore (feat-tsk-api)",
        breaking: false,
        hash: "3846ec4"
      },
      {
        type: "fix",
        scope: "web",
        description: "close the mobile sidebar when a menu link is followed",
        breaking: false,
        hash: "8153a26"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "project dates below the title on the project detail (OQ-101)",
        breaking: false,
        hash: "4385fbc"
      },
      {
        type: "feat",
        scope: null,
        description:
          "project dates in the list and detail, search also matches the lead (feat-prj-dates-lead-search)",
        breaking: false,
        hash: "0b77a13"
      }
    ]
  },
  {
    app: "web",
    version: "0.2.0",
    tag: "web-v0.2.0",
    date: "2026-10-04",
    commitCount: 6,
    changes: [
      {
        type: "feat",
        scope: "web",
        description:
          "projects list, detail and create/edit dialog on the API (feat-prj-web)",
        breaking: false,
        hash: "98d1811"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "projects API with task counts, restore and the project-lead user search (feat-prj-api)",
        breaking: false,
        hash: "ae464a7"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "user drawer and profile page with sign out of all devices (feat-shell-user-menu)",
        breaking: false,
        hash: "53c5649"
      }
    ]
  },
  {
    app: "web",
    version: "0.1.0",
    tag: "web-v0.1.0",
    date: "2026-10-03",
    commitCount: 17,
    changes: [
      {
        type: "feat",
        scope: "infra",
        description:
          "automatic release versions from git tags and conventional commits (feat-ops-release-versions)",
        breaking: false,
        hash: "2df0a78"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "auth web session — token store, refresh, guard, sign-in and sign-out (feat-auth-web-session)",
        breaking: false,
        hash: "a960ba3"
      },
      {
        type: "feat",
        scope: "web,api",
        description:
          "Problem Details error responses in OpenAPI (feat-api-error-docs)",
        breaking: false,
        hash: "5d03de5"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "Google sign-in, sessions and GET /me (feat-auth-api-session)",
        breaking: false,
        hash: "ccd26cf"
      },
      {
        type: "feat",
        scope: null,
        description:
          "sidebar branding with web and API versions, GET /api/v1/version",
        breaking: false,
        hash: "4650899"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "sidebar nav sections and a fixed footer with Trash and Settings",
        breaking: false,
        hash: "83842c5"
      },
      {
        type: "fix",
        scope: "web",
        description:
          "links styled as buttons are a plain Link with buttonVariants",
        breaking: false,
        hash: "80739af"
      },
      {
        type: "feat",
        scope: "web",
        description: "app footer with copyright line and legal links",
        breaking: false,
        hash: "507b994"
      },
      {
        type: "feat",
        scope: "web",
        description: "sidebar nav hover highlight like the template (CSS only)",
        breaking: false,
        hash: "844386c"
      }
    ]
  },
  {
    app: "web",
    version: "0.0.1",
    tag: "web-v0.0.1",
    date: "2026-10-02",
    commitCount: 6,
    changes: [
      {
        type: "feat",
        scope: "web",
        description:
          "landing at /, app under /app, slash-free URLs (T-0007..T-0009)",
        breaking: false,
        hash: "285a3a0"
      },
      {
        type: "feat",
        scope: "infra",
        description:
          "add web-deploy, api-deploy and ci workflows (T-0003, T-0004)",
        breaking: false,
        hash: "1a82edd"
      },
      {
        type: "feat",
        scope: "web",
        description:
          "bootstrap web/ from the dashboard template as a static export (T-0002)",
        breaking: false,
        hash: "a8d48f6"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "bootstrap NestJS app with config, Drizzle/Redis, health check and Problem Details errors (T-0001)",
        breaking: false,
        hash: "27af3c4"
      }
    ]
  },
  {
    app: "api",
    version: "0.6.0",
    tag: "api-v0.6.0",
    date: "2026-10-15",
    commitCount: 1,
    changes: [
      {
        type: "feat",
        scope: "api",
        description: "migration 0006 drops deleted_at (T-0063, push 2)",
        breaking: false,
        hash: "2177cd6"
      }
    ]
  },
  {
    app: "api",
    version: "0.5.0",
    tag: "api-v0.5.0",
    date: "2026-10-15",
    commitCount: 1,
    changes: [
      {
        type: "feat",
        scope: "api",
        description:
          "stop declaring deleted_at on projects and tasks (T-0063, push 1)",
        breaking: false,
        hash: "932275a"
      }
    ]
  },
  {
    app: "api",
    version: "0.4.0",
    tag: "api-v0.4.0",
    date: "2026-10-15",
    commitCount: 3,
    changes: [
      {
        type: "feat",
        scope: null,
        description:
          "permanent delete of projects and tasks, Delete day (T-0060–T-0062)",
        breaking: false,
        hash: "101a26f"
      }
    ]
  },
  {
    app: "api",
    version: "0.3.0",
    tag: "api-v0.3.0",
    date: "2026-10-11",
    commitCount: 9,
    changes: [
      {
        type: "feat",
        scope: null,
        description:
          "prototype sync: logged time, Dashboard and Bookings from the prototype (feat-proto-sync-web)",
        breaking: false,
        hash: "94b9f91"
      },
      {
        type: "feat",
        scope: "api",
        description: "dashboard report: GET /reports/dashboard (feat-rpt-api)",
        breaking: false,
        hash: "1a6c73b"
      },
      {
        type: "fix",
        scope: "api",
        description:
          "replacing a time log's link clears the retained names (T-0051)",
        breaking: false,
        hash: "0836a0d"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "bookings: booking_date, GET/PUT /bookings, clearing on edit (feat-book-api)",
        breaking: false,
        hash: "1a05430"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "time logging: workdays, time logs and the daily target (feat-tlog-api)",
        breaking: false,
        hash: "eae1c2e"
      }
    ]
  },
  {
    app: "api",
    version: "0.2.0",
    tag: "api-v0.2.0",
    date: "2026-10-04",
    commitCount: 4,
    changes: [
      {
        type: "feat",
        scope: "api",
        description:
          "tasks module, CRUD, filters, move and restore (feat-tsk-api)",
        breaking: false,
        hash: "3846ec4"
      },
      {
        type: "feat",
        scope: null,
        description:
          "project dates in the list and detail, search also matches the lead (feat-prj-dates-lead-search)",
        breaking: false,
        hash: "0b77a13"
      }
    ]
  },
  {
    app: "api",
    version: "0.1.0",
    tag: "api-v0.1.0",
    date: "2026-10-04",
    commitCount: 11,
    changes: [
      {
        type: "feat",
        scope: "api",
        description:
          "projects API with task counts, restore and the project-lead user search (feat-prj-api)",
        breaking: false,
        hash: "ae464a7"
      },
      {
        type: "feat",
        scope: "infra",
        description:
          "automatic release versions from git tags and conventional commits (feat-ops-release-versions)",
        breaking: false,
        hash: "2df0a78"
      },
      {
        type: "feat",
        scope: "web,api",
        description:
          "Problem Details error responses in OpenAPI (feat-api-error-docs)",
        breaking: false,
        hash: "5d03de5"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "Google sign-in, sessions and GET /me (feat-auth-api-session)",
        breaking: false,
        hash: "ccd26cf"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "projects and tasks tables, task_status enum and their migration",
        breaking: false,
        hash: "c9f2c2b"
      },
      {
        type: "feat",
        scope: null,
        description:
          "sidebar branding with web and API versions, GET /api/v1/version",
        breaking: false,
        hash: "4650899"
      },
      {
        type: "feat",
        scope: "api",
        description: "users and user_identities tables and their migration",
        breaking: false,
        hash: "fa78285"
      }
    ]
  },
  {
    app: "api",
    version: "0.0.1",
    tag: "api-v0.0.1",
    date: "2026-10-02",
    commitCount: 3,
    changes: [
      {
        type: "fix",
        scope: "api",
        description: "load .env in local dev (T-0001)",
        breaking: false,
        hash: "219089b"
      },
      {
        type: "feat",
        scope: "api",
        description:
          "bootstrap NestJS app with config, Drizzle/Redis, health check and Problem Details errors (T-0001)",
        breaking: false,
        hash: "27af3c4"
      }
    ]
  }
];
