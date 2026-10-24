import {
  ArrowLeft,
  CalendarCheck,
  ChartColumn,
  Clock,
  FolderKanban,
  Globe,
  ListTodo,
  NotebookPen,
  Settings
} from "lucide-react";
import { routes as realRoutes } from "@/lib/routes";
import { routes } from "@/proto/lib/routes";
import type { MenuItem } from "./menu";

/** Prototype navigation: the real nav plus Bookings, all under `/proto/app`. */
export const protoSidebarItems: MenuItem[] = [
  {
    heading: "Dashboard",
    items: [
      {
        id: "dashboard",
        name: "Statistics",
        icon: ChartColumn,
        url: routes.app.dashboard
      }
    ]
  },
  {
    heading: "Project management",
    items: [
      {
        id: "projects",
        name: "Projects",
        icon: FolderKanban,
        url: routes.app.projects
      },
      { id: "tasks", name: "Tasks", icon: ListTodo, url: routes.app.tasks },
      { id: "notes", name: "Notes", icon: NotebookPen, url: routes.app.notes }
    ]
  },
  {
    heading: "Time",
    items: [
      { id: "time", name: "Logs", icon: Clock, url: routes.app.time },
      {
        id: "bookings",
        name: "Bookings",
        icon: CalendarCheck,
        url: routes.app.bookings
      }
    ]
  }
];

/** FR-INT-006: below Time once a PMSPA connection is saved, whatever its status. */
export const connectorItems: MenuItem = {
  heading: "Connectors",
  items: [
    {
      id: "pmspa",
      name: "PMSPA",
      icon: Globe,
      url: routes.app.connectors.pmspa
    }
  ]
};

export const protoFooterItems: MenuItem[] = [
  {
    items: [
      {
        id: "settings",
        name: "Settings",
        icon: Settings,
        url: routes.app.settings
      },
      {
        id: "exit",
        name: "Back to app",
        icon: ArrowLeft,
        url: realRoutes.app.dashboard
      }
    ]
  }
];
