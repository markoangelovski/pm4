import {
  House,
  Clock,
  FolderKanban,
  ListTodo,
  Trash2,
  Settings,
  type LucideIcon
} from "lucide-react";
import { routes } from "@/lib/routes";

export interface ChildItem {
  id?: string;
  name: string;
  icon?: LucideIcon;
  items?: ChildItem[];
  url?: string;
  color?: string;
  disabled?: boolean;
  external?: boolean;
  isActive?: boolean;
}

export interface MenuItem {
  heading?: string;
  items?: ChildItem[];
}

/**
 * PM4 navigation, grouped under headings (routing.md: Navigation):
 * Dashboard, Project management (Projects, Tasks) and Time (Logs).
 * Trash and Settings live in `footerItems`.
 */
const SidebarContent: MenuItem[] = [
  {
    heading: "Dashboard",
    items: [
      {
        id: "dashboard",
        name: "Default",
        icon: House,
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
      { id: "tasks", name: "Tasks", icon: ListTodo, url: routes.app.tasks }
    ]
  },
  {
    heading: "Time",
    items: [{ id: "time", name: "Logs", icon: Clock, url: routes.app.time }]
  }
];

export default SidebarContent;

/** The fixed sidebar footer (OQ-054): no heading. */
export const footerItems: MenuItem[] = [
  {
    items: [
      { id: "trash", name: "Trash", icon: Trash2, url: routes.app.trash },
      {
        id: "settings",
        name: "Settings",
        icon: Settings,
        url: routes.app.settings
      }
    ]
  }
];
